const express = require('express');
const logger = require('@basaas/node-logger');
const multer = require('multer');
const uuid = require('uuid');
const mkdirp = require('mkdirp');
const fs = require('fs-extra');
const { domainOwnerOrAllowed } = require('../../../middleware/permission');
const { isLocalRequest } = require('../../../util/common');
const conf = require('../../../conf');
const { USER, TENANT } = require('../../../constant').ENTITY_TYPE;
const { DomainDAO, SchemaDAO } = require('../../../dao');
const Pagination = require('../../../util/pagination');
const {
    transformSchema, validateSchema, URIfromId, transformDbResults,
} = require('../../../transform');
const { processArchive } = require('../../../bulk');

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

function buildURI({ domainId, uri }) {
    return `${conf.apiBase}/domains/${domainId}/schemas/${uri}`;
}

router.get('/', domainOwnerOrAllowed({
    permissions: ['not.defined'],
}), async (req, res) => {
    const pagination = new Pagination(
        req.originalUrl,
        SchemaDAO,
    );

    let data;
    let meta;

    if (req.hasAll) {
        data = await SchemaDAO.findByDomain({
            domainId: req.domainId,
            options: pagination.props(),
        });

        meta = {
            ...await pagination.calc({
                domainId: req.domainId,
            }),
        };
    } else {
        data = await SchemaDAO.findByDomainAndEntity({
            entityId: req.user.sub,
            domainId: req.domainId,
            options: pagination.props(),
        });
        meta = {
            ...await pagination.calc({
                domainId: req.domainId,
                'owners.id': req.user.sub,
            }),
        };
    }

    res.send({
        data: transformDbResults(data),
        meta,
    });
});

router.post('/', domainOwnerOrAllowed({
    permissions: ['not.defined'],
}), async (req, res, next) => {
    const { data } = req.body;
    try {
        if (!data) throw 'Missing data';

        const { name, description, value } = data;

        validateSchema({
            schema: value,
        });

        const transformed = await transformSchema({
            domain: req.domainId,
            schema: value,
        });

        let owner;

        if (req.isOwnerOf) {
            owner = req.user.sub.toString();
        } else {
            // get owner of domain
            const { owners } = await DomainDAO.findOne({
                _id: req.domainId,
            });
            owner = owners[0].id;
        }

        res.send({
            data: transformDbResults(await SchemaDAO.create({
                obj: {
                    name: name || transformed.schema.title,
                    domainId: req.domainId,
                    description,
                    uri: URIfromId(transformed.schema.$id),
                    value: JSON.stringify(transformed.schema),
                    refs: transformed.backReferences,
                    owners: [{
                        id: owner,
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

router.get('/:uri*', async (req, res, next) => {
    if (!req.user && isLocalRequest(req)) {
        return next();
    }
    domainOwnerOrAllowed({
        permissions: ['not.defined'],
    })(req, res, next);
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
        });
    }
});


router.put('/:uri*', domainOwnerOrAllowed({
    permissions: ['not.defined'],
}), async (req, res, next) => {
    const { data } = req.body;
    try {
        if (!data) throw 'Missing data';

        const { name, description, value } = data;

        validateSchema({
            schema: value,
        });

        const transformed = await transformSchema({
            domain: req.domainId,
            schema: value,
        });

        res.send({
            data: transformDbResults(await SchemaDAO.updateByURI({

                name: name || transformed.schema.title,
                domainId: req.domainId,
                description,
                uri: buildURI({
                    domainId: req.domainId,
                    uri: req.path.replace(/^\//, ''),
                }),
                value: JSON.stringify(transformed.schema),
                refs: transformed.backReferences,
            })),
        });
    } catch (err) {
        log.error(err);
        next({
            status: 500,
        });
    }
});

router.delete('/:uri*', domainOwnerOrAllowed({
    permissions: ['not.defined'],
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
        });
    }
});

// bulk upload

router.post('/import', domainOwnerOrAllowed({
    permissions: ['not.defined'],
}), upload.single('archive'), async (req, res, next) => {
    let session = null;
    const file = req.file;
    try {
        if (!file) throw 'No file submitted';
        const transformedSchemas = await processArchive(file.path, req.domainId);

        let owner;

        if (req.isOwnerOf) {
            owner = req.user.sub.toString();
        } else {
            // get owner of domain
            const { owners } = await DomainDAO.findOne({
                _id: req.domainId,
            });
            owner = owners[0].id;
        }

        // start transaction
        session = await SchemaDAO.startTransaction();
        for (const schema of transformedSchemas) {
            await SchemaDAO.create({
                obj: {
                    name: schema.schema.title,
                    domainId: req.domainId,
                    uri: URIfromId(schema.schema.$id),
                    value: JSON.stringify(schema.schema),
                    refs: schema.backReferences,
                    owners: {
                        id: owner,
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

module.exports = router;
