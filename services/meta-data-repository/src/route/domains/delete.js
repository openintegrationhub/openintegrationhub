const express = require('express');
const logger = require('@basaas/node-logger');
const { domainOwnerOrAllowed } = require('../../middleware/permission');
const conf = require('../../conf');
const { DomainDAO } = require('../../dao');
const {
    transformDbResults,
} = require('../../transform');

const log = logger.getLogger(`${conf.log.namespace}/domains:delete`);

const router = express.Router();

router.delete('/:id', domainOwnerOrAllowed({}), async (req, res, next) => {
    try {
        res.send({
            data: transformDbResults(await DomainDAO.delete(req.params.id)),
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
