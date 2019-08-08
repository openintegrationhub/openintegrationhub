const express = require('express');
const logger = require('@basaas/node-logger');
const { domainOwnerOrAllowed } = require('../../middleware/permission');
const conf = require('../../conf');
const { TENANT_ADMIN } = require('../../constant').ROLE;
const { DomainDAO } = require('../../dao');
const Pagination = require('../../util/pagination');
const {
    transformDbResults,
} = require('../../transform');

const log = logger.getLogger(`${conf.logging.namespace}/domains:get`);

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const pagination = new Pagination(
            req.originalUrl,
            DomainDAO,
            req.user.sub,
        );

        const ownerId = req.user.role === TENANT_ADMIN ? req.user.tenantId : req.user.sub;

        res.send({
            data: transformDbResults(await DomainDAO.findByEntityWithPagination(
                req.user.sub,
                pagination.props(),
            )),
            meta: {
                ...await pagination.calc({
                    'owners.id': ownerId,
                }),
            },
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
            err,
        });
    }
});

router.get('/:id', domainOwnerOrAllowed({
    permissions: ['not.defined'],
}), async (req, res, next) => {
    try {
        res.send({
            data: transformDbResults(await DomainDAO.findOne({
                _id: req.params.id,
            })),
        });
    } catch (err) {
        log.error(err, { 'x-request-id': req.headers['x-request-id'] });
        next({
            status: 500,
            err,
        });
    }
});

module.exports = router;
