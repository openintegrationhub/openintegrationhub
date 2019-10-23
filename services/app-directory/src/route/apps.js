const express = require('express');
const logger = require('@basaas/node-logger');
const { isAdmin, can } = require('@openintegrationhub/iam-utils');
const { userHasWriteAccess } = require('../middleware/apps');
const conf = require('../conf');
const CONSTANTS = require('../constant');
const PERMISSIONS = require('../constant/permission');
const AppsDAO = require('../dao/apps');

const log = logger.getLogger(`${conf.logging.namespace}/integratedApps`);

const router = express.Router();

router.get('/', async (req, res, next) => {
    let apps = [];

    try {
        if (req.user.tenant) {
            const tenantApps = await AppsDAO.find({
                tenant: req.user.tenant,
            });
            apps = apps.concat(tenantApps);
        }
        const globalApps = await AppsDAO.find({
            isGlobal: true,
        });
        apps = apps.concat(globalApps);
        return res.send(apps);
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.post('/', can([PERMISSIONS.common.manageApps]), async (req, res, next) => {
    const appData = req.body;

    if (!isAdmin(req.user)) {
        appData.tenant = req.user.tenant;
        delete appData.isGlobal;
    }

    try {
        const app = await AppsDAO.create({
            ...appData,
        });

        return res.send(app);
    } catch (err) {
        log.error(err, err.name);
        if (err.code === 11000) {
            return next({
                status: 400,
                message: err.errmsg,
            });
        }
        return next({
            status: 500,
            message: err,
        });
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const app = await AppsDAO.findOne({
            _id: req.params.id,
            $or: [
                {
                    tenant: req.user.tenant,
                },
                {
                    isGlobal: true,
                },
            ],
        });

        if (!app) {
            return res.sendStatus(404);
        }
        return res.send(app);
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.patch('/:id', userHasWriteAccess, async (req, res, next) => {

    const appData = req.body;

    if (!isAdmin(req.user)) {
        delete appData.tenant;
        delete appData.creator;
    }


    try {
        const app = await AppsDAO.update({
            _id: req.params.id,
        }, appData);
        return res.send(app);
    } catch (err) {
        log.error(err);
        return next({
            status: 400,
        });
    }
});

router.delete('/:id', userHasWriteAccess, async (req, res, next) => {
    try {
        await AppsDAO.delete({
            id: req.params.id,
        });
        return res.sendStatus(204);
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

router.delete('/', can([PERMISSIONS.restricted.appDeleteAny]), async (req, res, next) => {

    let tenant = req.user.tenant;

    if (!isAdmin(req.user) && req.query.tenant) {
        tenant = req.query.tenant;
    }

    try {
        await AppsDAO.deleteAll({
            tenant,
        });
        return res.sendStatus(204);
    } catch (err) {
        log.error(err);
        return next({
            status: 500,
        });
    }
});

module.exports = router;
