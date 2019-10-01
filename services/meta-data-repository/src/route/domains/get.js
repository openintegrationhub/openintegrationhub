const express = require('express');
const logger = require('@basaas/node-logger');
const { domainOwnerOrAllowed, hasReadAccess } = require('../../middleware/permission');
const conf = require('../../conf');
const { TENANT_ADMIN } = require('../../constant').ROLE;
const { DomainDAO } = require('../../dao');
const Pagination = require('../../util/pagination');
const {
    transformDbResults,
} = require('../../transform');

const log = logger.getLogger(`${conf.log.namespace}/domains:get`);

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const pagination = new Pagination(
            req.originalUrl,
            DomainDAO,
        );

        const tenant = req.user.tenant;

        res.send({
            data: transformDbResults(await DomainDAO.findByEntityWithPagination(
                req.user,
                pagination.props(),
            )),
            meta: {
                ...await pagination.calc({
                    tenant,
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

router.get('/:id', hasReadAccess, async (req, res, next) => {
    try {
        const domain = await DomainDAO.findOne({
            _id: req.params.id,
        });

        res.send({
            data: transformDbResults(domain),
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
