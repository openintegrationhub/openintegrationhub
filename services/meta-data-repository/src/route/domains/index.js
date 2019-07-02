const express = require('express');
const logger = require('@basaas/node-logger');
const mkdirp = require('mkdirp');
const { domainOwnerOrAllowed } = require('../../middleware/permission');
const conf = require('../../conf');
const { USER } = require('../../constant').ENTITY_TYPE;
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

router.get('/', async (req, res) => {
    const pagination = new Pagination(
        req.originalUrl,
        DomainDAO,
        req.user.sub,
    );
    res.send({
        data: transformDbResults(await DomainDAO.findByEntityWithPagination(
            req.user.sub,
            pagination.props(),
        )),
        meta: {
            ...await pagination.calc({
                'owners.id': req.user.sub,
            }),
        },
    });
});

router.post('/', async (req, res, next) => {
    const { data } = req.body;
    try {
        res.send({
            data: transformDbResults(await DomainDAO.create({
                ...data,
                owners: {
                    id: req.user.sub.toString(),
                    type: USER,
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
            data: await DomainDAO.findOne({
                _id: req.params.id,
            }),
        });
    } catch (err) {
        log.error(err, { 'x-request-id': req.headers['x-request-id'] });
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
