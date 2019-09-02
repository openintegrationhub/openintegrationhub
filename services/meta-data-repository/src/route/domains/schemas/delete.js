const express = require('express');
const logger = require('@basaas/node-logger');
const { PERMISSIONS } = require('@openintegrationhub/iam-utils');
const { domainOwnerOrAllowed } = require('../../../middleware/permission');

const conf = require('../../../conf');
const { SchemaDAO } = require('../../../dao');

const {
    buildURI,
} = require('../../../transform');

const log = logger.getLogger(`${conf.logging.namespace}/domains/schmemas:delete`);

const router = express.Router();

router.delete('/:uri*', domainOwnerOrAllowed({
    permissions: [PERMISSIONS.common["metadata.domains.crud"]],
}), async (req, res, next) => {
    try {
        await SchemaDAO.delete(buildURI({
            domainId: req.domainId,
            uri: req.path.replace(/^\//, ''),
        }));
        res.sendStatus(204);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
            err,
        });
    }
});

module.exports = router;
