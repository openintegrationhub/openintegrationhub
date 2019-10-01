const express = require('express');
const logger = require('@basaas/node-logger');
const {
    transformDbResults,
    buildURI,
} = require('../../../transform');
const { SchemaDAO } = require('../../../dao');
const { domainOwnerOrAllowed, hasReadAccess } = require('../../../middleware/permission');
const Pagination = require('../../../util/pagination');
const conf = require('../../../conf');
const { isLocalRequest } = require('../../../util/common');

const log = logger.getLogger(`${conf.log.namespace}/domains/schemas:get`);

const router = express.Router();

router.get('/', domainOwnerOrAllowed({}), async (req, res) => {
    const pagination = new Pagination(
        req.originalUrl,
        SchemaDAO,
    );

    let data;
    let meta;

    // TODO authorization access to domainId?
    data = await SchemaDAO.findByDomain({
        domainId: req.domainId,
        options: pagination.props(),
    });

    meta = {
        ...await pagination.calc({
            domainId: req.domainId,
        }),
    };

    // if (req.hasAll) {
    //     data = await SchemaDAO.findByDomain({
    //         domainId: req.domainId,
    //         options: pagination.props(),
    //     });
    //
    //     meta = {
    //         ...await pagination.calc({
    //             domainId: req.domainId,
    //         }),
    //     };
    // } else {
    //     data = await SchemaDAO.findByDomainAndEntity({
    //         entityId: req.user.sub,
    //         requester: req.user,
    //         domainId: req.domainId,
    //         options: pagination.props(),
    //     });
    //     meta = {
    //         ...await pagination.calc({
    //             domainId: req.domainId,
    //             'owners.id': req.user.sub,
    //         }),
    //     };
    // }

    res.send({
        data: transformDbResults(data),
        meta,
    });
});

router.get('/:uri*', async (req, res, next) => {
    if (!req.user && isLocalRequest(req)) {
        return next();
    }
    hasReadAccess(req, res, next);
}, async (req, res, next) => {
    try {
        const schema = await SchemaDAO.findByURI({
            uri: buildURI({
                domainId: req.domainId,
                uri: req.path.replace(/^\//, ''),
            }),
        });

        if (!schema) return next({ status: 404 });

        if (req.header('content-type') === 'application/schema+json') {
            return res.send(schema.value);
        }

        res.send({
            data: transformDbResults(schema),
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
