const express = require('express');
const logger = require('@basaas/node-logger');
const multer = require('multer');
const uuid = require('uuid');
const mkdirp = require('mkdirp');
const fs = require('fs-extra');

const conf = require('../../conf');
const { USER } = require('../../constant').ENTITY_TYPE;
const { DomainDAO, SchemaDAO } = require('../../dao');
const { isOwnerOfDomain } = require('../../middleware/is-owner');
const Pagination = require('../../util/pagination');
const {
    transformSchema, validateSchema, URIfromId, transformDbResults,
} = require('../../transform');
const { processArchive } = require('../../bulk');

const log = logger.getLogger(`${conf.logging.namespace}/domains`);

const router = express.Router();

// create upload path
mkdirp.sync(conf.importFilePath);

// SET STORAGE
const storage = multer.diskStorage({
    async destination(req, file, cb) {
        const dest = `${conf.importFilePath}/${uuid.v4()}`;
        await fs.ensureDir(dest);
        cb(null, dest);
    },
    filename(req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

function buildURI(params) {
    return `${conf.apiBase}/domains/${params.id}/schemas/${params.uri}${params[0]}`;
}

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

router.get('/:id', isOwnerOfDomain, async (req, res, next) => {
    try {
        const domain = req.obj;

        if (domain) {
            res.send({
                data: transformDbResults(domain),
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

// schema
router.get('/:id/schemas', async (req, res) => {
    const pagination = new Pagination(
        req.originalUrl,
        SchemaDAO,
        req.user.sub,
    );
    res.send({
        data: transformDbResults(await SchemaDAO.findByDomainAndEntity({
            entity: req.user.sub,
            domain: req.params.id,
            options: pagination.props(),
        })),
        meta: {
            ...await pagination.calc({
                domainId: req.params.id,
                'owners.id': req.user.sub,
            }),
        },
    });
});

router.get('/:id/schemas/:uri*', async (req, res, next) => {
    try {
        const schema = await SchemaDAO.findByURI({
            uri: buildURI(req.params),
        });

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
            obj: {
                name: 'foo',
                domainId: req.params.id,
                uri: URIfromId(transformed.schema.$id),
                value: JSON.stringify(transformed.schema),
                refs: transformed.backReferences,
                owners: {
                    id: req.user.sub.toString(),
                    type: USER,
                },
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

// bulk upload

router.post('/:id/schemas/import', upload.single('archive'), async (req, res, next) => {
    let session = null;
    try {
        const file = req.file;
        if (!file) {
            throw (new Error('No file submitted'));
        } else {
            const transformedSchemas = await processArchive(file.path, req.params.id);
            // start transaction
            session = await SchemaDAO.startTransaction();
            for (const schema of transformedSchemas) {
                await SchemaDAO.createUpdate({
                    obj: {
                        name: 'foo',
                        domainId: req.params.id,
                        uri: URIfromId(schema.schema.$id),
                        value: JSON.stringify(schema.schema),
                        refs: schema.backReferences,
                        owners: {
                            id: req.user.sub.toString(),
                            type: USER,
                        },
                    },
                    options: {
                        session,
                    },
                });
            }
            // end transaction
            await SchemaDAO.endTransaction(session);
        }
        res.sendStatus(200);
    } catch (err) {
        // abort transaction if session exists
        log.error(err);
        if (session) {
            await SchemaDAO.abortTransaction(session);
        }
        next({
            status: 400,
        });
    } finally {
        if (req.file) {
            await fs.remove(req.file.destination);
        }
    }
});

router.delete('/:id/schemas/:uri*', async (req, res, next) => {
    try {
        await SchemaDAO.delete(buildURI(req.params));
        res.sendStatus(204);
    } catch (err) {
        log.error(err);
        next({
            status: 400,
        });
    }
});

module.exports = router;
