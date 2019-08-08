const express = require('express');
const logger = require('@basaas/node-logger');
const { domainOwnerOrAllowed } = require('../../middleware/permission');
const conf = require('../../conf');
const { DomainDAO } = require('../../dao');
const {
    transformDbResults,
} = require('../../transform');

const log = logger.getLogger(`${conf.logging.namespace}/domains:put`);

const router = express.Router();

router.put('/:id', domainOwnerOrAllowed({
    permissions: ['not.defined'],
}), async (req, res, next) => {
    try {
        if (req.body.owners) {
            delete req.body.owners;
        }

        res.send({
            data: transformDbResults(await DomainDAO.updateById({
                id: req.params.id,
                ...req.body,
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
