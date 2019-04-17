const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser');
const { parsePagedQuery } = require('../../middleware');
const Component = require('../../models/Component');

async function loadComponent(req, res, next) {
    const { id } = req.params;
    const { user } = req;

    const component = await Component.findOne({
        _id: id
    });

    if (!component) {
        throw new Error('Component is not found');
    }

    const owner = component.owners.find(o => o.type === 'user' && o.id === user.sub);

    if (!owner) {
        throw new Error('Not authorized');
    }

    req.component = component;

    return next();
}

module.exports = ({ iam }) => {
    const { can } = iam;
    const loadComp = asyncHandler(loadComponent);

    router.use(asyncHandler(iam.middleware));
    router.use((req, res, next) => {
        req.logger.trace({user: req.user}, 'Resolved IAM user');
        return next();
    });

    router.get('/', parsePagedQuery(), asyncHandler(require('./GetList')));
    router.post('/', can('components.create'), bodyParser.json(), asyncHandler(require('./Create')));
    router.get('/:id', loadComp, asyncHandler(require('./GetOne')));
    router.patch('/:id', loadComp, bodyParser.json(), asyncHandler(require('./PatchOne')));
    router.delete('/:id', loadComp, asyncHandler(require('./Delete')));

    return router;
};
