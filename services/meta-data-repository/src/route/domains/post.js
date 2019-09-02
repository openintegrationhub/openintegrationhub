const express = require('express');
const logger = require('@basaas/node-logger');
const { can, PERMISSIONS } = require('@openintegrationhub/iam-utils');
const conf = require('../../conf');
const { USER, TENANT } = require('../../constant').ENTITY_TYPE;
const { DomainDAO } = require('../../dao');

const {
    transformDbResults,
} = require('../../transform');

const log = logger.getLogger(`${conf.logging.namespace}/domains:post`);

const router = express.Router();

router.post('/', can([PERMISSIONS.common["metadata.domains.crud"]]), async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            req.body.public = false;
        }
        res.send({
            data: transformDbResults(await DomainDAO.create({
                obj: {
                    ...req.body,
                    owners: [{
                        id: req.user.sub.toString(),
                        type: USER,
                    }],
                    tenant: req.user.tenant,
                },

            })),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
            err,
        });
    }
});

module.exports = router;
