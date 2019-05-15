const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser').json();
const { parsePagedQuery } = require('../../middleware');
const Component = require('../../models/Component');

async function loadComponent(req, res, next) {
    const { id } = req.params;
    const component = await Component.findById(id);

    if (!component) {
        const error = new Error('Component is not found');
        error.statusCode = 404;
        throw error;
    }

    req.component = component;

    return next();
}

async function hasAccess(req, res, next) {
    const { user, component } = req;

    if (['ADMIN', 'SERVICE_ACCOUNT'].includes(user.role)) {
        return next();
    }

    if (!component.owners.find(o => o.type === 'user' && o.id === user.sub)) {
        throw new Error('Not authorized');
    }

    return next();
}

module.exports = ({ iam }) => {
    const { can } = iam;
    const loadComp = asyncHandler(loadComponent);
    const authorize = asyncHandler(hasAccess);

    const GetList = asyncHandler(require('./GetList'));
    const Create = asyncHandler(require('./Create'));
    const GetOne = asyncHandler(require('./GetOne'));
    const PatchOne = asyncHandler(require('./PatchOne'));
    const Delete = asyncHandler(require('./Delete'));

    router.use(asyncHandler(iam.middleware));
    router.use((req, res, next) => {
        req.logger.trace({user: req.user}, 'Resolved IAM user');
        return next();
    });

    router.get('/', can('components.list'), parsePagedQuery(), GetList);
    router.post('/', can('components.create'), bodyParser, Create);
    router.get('/:id', can('components.get'), loadComp, authorize, GetOne);
    router.patch('/:id', can('components.patch'), loadComp, authorize, bodyParser, PatchOne);
    router.delete('/:id', can('components.delete'), loadComp, authorize, Delete);

    return router;
};
