const express = require('express');
const logger = require('@basaas/node-logger');

const conf = require('../../conf');
const { USER } = require('../../constant').ENTITY_TYPE;
const { DomainDAO } = require('../../dao');
const { isOwnerOfDomain } = require('../../middleware/is-owner');
const Pagination = require('../../util/pagination');

const log = logger.getLogger(`${conf.logging.namespace}/domains`);

const router = express.Router();

// GET
// /domains/{domainId}
// Retrieve a domain with given ID.
// PUT
// /domains/{domainId}
// Update a domain by ID.
// POST
// /domains/{domainId}/import
// Import models.
// GET
// /domains/{domainId}/schemas
// Retrieve the available models for the authenticated user.
// GET
// /domains/{domainId}/schemas/{uri}
// Retrieve a schema by URI.
// PUT
// /domains/{domainId}/schemas/{uri}
// Update a schema with given URI.
// DELETE
// /domains/{domainId}/schemas/{uri}
// Delete a schema by uri

router.get('/', async (req, res) => {
    const pagination = new Pagination(
        req.originalUrl,
        DomainDAO,
        req.user.sub,
    );
    res.send({
        data: await DomainDAO.findByEntityWithPagination(
            req.user.sub,
            pagination.props(),
        ),
        meta: {
            ...await pagination.calc(),
        },
    });
});

router.get('/:id', isOwnerOfDomain, async (req, res, next) => {
    try {
        const domain = req.obj;

        if (domain) {
            res.send({
                data: domain,
            });
        } else {
            res.sendStatus(403);
        }
    } catch (err) {
        log.error(err, { 'x-request-id': req.headers['x-request-id'] });
        next({
            status: 500,
        });
    }
});

router.post('/', async (req, res, next) => {
    const { data } = req.body;
    try {
        res.send({
            data: await DomainDAO.create({
                ...data,
                owners: {
                    id: req.user.sub.toString(),
                    type: USER,
                },
            }),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
