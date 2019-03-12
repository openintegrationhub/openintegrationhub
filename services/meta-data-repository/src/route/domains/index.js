const express = require('express');
const logger = require('@basaas/node-logger');

const conf = require('../../conf');
const { USER } = require('../../constant').ENTITY_TYPE;
const { DomainDAO, SchemaDAO } = require('../../dao');
const { isOwnerOfDomain } = require('../../middleware/is-owner');
const Pagination = require('../../util/pagination');
const { transformSchema, validateSchema, URIfromId } = require('../../transform');

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

// schema

router.get('/:id/schemas/:uri', async (req, res, next) => {
    try {
        const schema = await SchemaDAO.findByURI(`${conf.apiBase}/domains/${req.params.id}/schemas/${req.params.uri}`);

        if (req.header('content-type') === 'application/schema+json') {
            return res.send(schema.value);
        }

        res.send({
            data: {
                ...schema,
            },
        });
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

router.post('/:id/schemas', async (req, res, next) => {
    const { data } = req.body;

    try {
        validateSchema({
            schema: data,
        });

        const transformed = await transformSchema({
            domain: req.params.id,
            schema: data,
        });

        await SchemaDAO.createUpdate({
            name: 'foo',
            uri: URIfromId(transformed.$id),
            value: JSON.stringify(transformed),
            owners: {
                id: req.user.sub.toString(),
                type: USER,
            },
        });

        res.sendStatus(200);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

// router.put('/:id/schemas/:uri', async (req, res, next) => {
//     try {
//         res.send({
//             // data: await DomainDAO.create({
//             //     ...data,
//             //     owners: {
//             //         id: req.user.sub.toString(),
//             //         type: USER,
//             //     },
//             // }),
//         });
//     } catch (err) {
//         log.error(err);
//         next({
//             status: 400,
//         });
//     }
// });

// router.delete('/:id/schemas/:uri', async (req, res, next) => {
//     try {
//         res.send({
//             // data: await DomainDAO.create({
//             //     ...data,
//             //     owners: {
//             //         id: req.user.sub.toString(),
//             //         type: USER,
//             //     },
//             // }),
//         });
//     } catch (err) {
//         log.error(err);
//         next({
//             status: 400,
//         });
//     }
// });


module.exports = router;
