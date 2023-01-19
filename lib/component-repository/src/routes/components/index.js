const express = require('express');
const asyncHandler = require('express-async-handler');
const config = require('../../config');
const bodyParser = express.json({limit:config.maxRequestBodySize});
const { parsePagedQuery } = require('../../middleware');

const Component = require('../../models/Component');

async function loadComponent(req, res, next) {
    const { id } = req.params;

    const version = ('version' in req.query)? req.query.version :  false;

    const isArtifactId = (id.substr(0, 9) === 'artifact_');

    let component;

    if(isArtifactId) {
      const qry = {artifactId: id};
      if(version !== false) {
        qry.version = version;
        component = await Component.findOne(qry).lean().exec();
      } else {
        component = await Component.findOne(qry).sort({'version': -1}).lean().exec();
      }
      component.id = component._id
      delete component._id;
      delete component.__v;
    } else {
      component = await Component.findById(id);
    }

    if (!component) {
        const error = new Error('Component is not found');
        error.statusCode = 404;
        throw error;
    }

    req.component = component;

    return next();
}

function checkReadAccess({iam}) {
    return async function (req, res, next) {
        const { user, component } = req;

        if (iam.hasOneOf({user, requiredPermissions: ['components.any.read']}) || component.access === 'public') {
            return next();
        }

        if (!component.owners.find(o => o.type === 'user' && o.id === user.sub)) {
            throw Object.assign(new Error('Not authorized'), {statusCode: 403});
        }

        return next();
    };
}

async function checkWriteAccess(req, res, next) {
    const { user, component } = req;

    if (user.isAdmin) {
        return next();
    }

    if (!component.owners.find(o => o.type === 'user' && o.id === user.sub)) {
        throw Object.assign(new Error('Not authorized'), {statusCode: 403});
    }

    return next();
}


module.exports = ({ iam }) => {
    const { can } = iam;
    const loadComp = asyncHandler(loadComponent);
    const canRead = asyncHandler(checkReadAccess({iam}));
    const canWrite = asyncHandler(checkWriteAccess);

    const GetList = asyncHandler(require('./GetList'));
    const Create = asyncHandler(require('./Create'));
    const GetOne = asyncHandler(require('./GetOne'));
    const PatchOne = asyncHandler(require('./PatchOne'));
    const Delete = asyncHandler(require('./Delete'));
    const GlobalConnectorStart = asyncHandler(require('./GlobalStart'));
    const GlobalConnectorStop = asyncHandler(require('./GlobalStop'));
    const GlobalConnectorRestartAll = asyncHandler(require('./GlobalRestartAll'));
    const Enrich = asyncHandler(require('./Enrich'));

    const router = express.Router();
    router.use(asyncHandler(iam.middleware));
    router.use((req, res, next) => {
        req.logger.trace({user: req.user}, 'Resolved IAM user');
        return next();
    });

    router.get('/', parsePagedQuery(), GetList);
    router.post('/', can(config.componentsCreatePermission), bodyParser, Create);
    router.get('/:id', loadComp, canRead, GetOne);
    router.patch('/:id', can(config.componentsUpdatePermission), loadComp, canWrite, bodyParser, PatchOne);
    router.delete('/:id', can(config.componentDeletePermission), loadComp, canWrite, Delete);

    router.post('/global/:id/start', can(config.adminPermission), loadComp, GlobalConnectorStart);
    router.post('/global/:id/stop', can(config.adminPermission), loadComp, GlobalConnectorStop);

    router.post('/global/restart/all', can(config.adminPermission), GlobalConnectorRestartAll);

    router.patch('/enrich/:id', can(config.componentsUpdatePermission), loadComp, canWrite, Enrich);

    return router;
};
