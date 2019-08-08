const express = require('express');
const logger = require('@basaas/node-logger');
const conf = require('../../conf');
const { USER, TENANT } = require('../../constant').ENTITY_TYPE;
const { DomainDAO } = require('../../dao');

const {
    transformDbResults,
} = require('../../transform');

const log = logger.getLogger(`${conf.logging.namespace}/domains:post`);

const router = express.Router();

router.post('/', async (req, res, next) => {
    try {
        res.send({
            data: transformDbResults(await DomainDAO.create({
                obj: {
                    ...req.body,
                    owners: [{
                        id: req.user.sub.toString(),
                        type: USER,
                    }, req.user.tenantId ? {
                        id: req.user.tenantId,
                        type: TENANT,
                        isImmutable: true,
                    } : {}],
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
