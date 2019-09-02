const express = require('express');
const logger = require('@basaas/node-logger');
const { domainOwnerOrAllowed } = require('../../middleware/permission');
const { can, PERMISSIONS } = require('@openintegrationhub/iam-utils');
const conf = require('../../conf');
const { DomainDAO } = require('../../dao');
const {
    transformDbResults,
} = require('../../transform');

const log = logger.getLogger(`${conf.logging.namespace}/domains:put`);

const router = express.Router();

router.put('/:id', can([PERMISSIONS.common["metadata.domains.crud"]]), async (req, res, next) => {
    try {
        // TODO?
        if (req.body.owners) {
            delete req.body.owners;
        }
        if (!req.user.isAdmin) {
            req.body.public = false;
        }

        res.send({
            data: transformDbResults(await DomainDAO.updateById({
                id: req.params.id,
                ...req.body,
                tenant: req.user.tenant,
            })),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 500,
            err,
        });
    }
});

module.exports = router;
