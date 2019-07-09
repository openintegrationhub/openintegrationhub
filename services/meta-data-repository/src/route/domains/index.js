const express = require('express');
const logger = require('@basaas/node-logger');
const mkdirp = require('mkdirp');
const { domainOwnerOrAllowed } = require('../../middleware/permission');
const conf = require('../../conf');
const { USER, TENANT } = require('../../constant').ENTITY_TYPE;
const { TENANT_ADMIN } = require('../../constant').ROLE;
const { DomainDAO } = require('../../dao');
const Pagination = require('../../util/pagination');
const {
    transformDbResults,
} = require('../../transform');

const schemasRouter = require('./schemas');

const log = logger.getLogger(`${conf.logging.namespace}/domains`);

const router = express.Router();

// create upload path
mkdirp.sync(conf.importFilePath);

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
        });
    }
});

router.post('/', async (req, res, next) => {
    const { data } = req.body;
    try {
        if (!data) throw 'Missing data';
        res.send({
            data: transformDbResults(await DomainDAO.create({
                obj: {
                    ...data,
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
        });
    }
});

router.put('/:id', domainOwnerOrAllowed({
    permissions: ['not.defined'],
}), async (req, res, next) => {
    const { data } = req.body;
    try {
        if (!data) throw 'Missing data';

        if (data.owners) {
            delete data.owners;
        }

        res.send({
            data: transformDbResults(await DomainDAO.updateById({
                id: req.params.id,
                ...data,
            })),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

// schemas
router.use('/:id/schemas', (req, res, next) => {
    req.domainId = req.params.id;
    next();
}, schemasRouter);

module.exports = router;
