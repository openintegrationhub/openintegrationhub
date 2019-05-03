const JsonRefs = require('json-refs');
const JsonPointer = require('json-pointer');
const Ajv = require('ajv');
const url = require('url');
const path = require('path');
const { SchemaReferenceError, SchemaValidationError } = require('../error');
const conf = require('../conf');

const ajv = new Ajv({
    schemaId: 'auto',
    allErrors: true,
    verbose: true,
});

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

function URIfromId(id) {
    return url.parse(id).path;
}

function transformURI({ domain, id, options = {} }) {
    let { pathname } = url.parse(id);
    // remove first slash if existing
    if (options.location) {
        pathname = options.location.replace(options.root, '');
    } else {
        pathname = path.basename(pathname);
    }

    return `domains/${domain}/schemas/${pathname}`.replace('//', '/');
}

function resolveRelativePath({ filePath, location, root }) {
    // resolve dots
    const dots = filePath.match(/(\.\.\/)+/);
    const fileName = filePath.substr(filePath.lastIndexOf('/') + 1);
    return path
        .resolve(
            location,
            '../',
            dots ? dots[0] : '',
            filePath.substr(0, filePath.lastIndexOf('/') + 1).replace(/\.\.\//g, ''),
            fileName,
        )
        .replace(root, '');
}

async function processExternalSchema({ domain, schema, jsonRefsOptions }) {
    console.log('processExternalSchema');
    console.log(schema);
    module.exports.validateSchema({
        schema,
    });

    await module.exports.transformSchema({
        domain,
        schema,
        jsonRefsOptions,
    });
    console.log('schema processed');
}

module.exports = {
    validateSchema({ schema, filePath }) {
        schema = typeof schema === 'string' ? JSON.parse(schema) : schema;
        ajv.validateSchema(schema);
        if (ajv.errors) {
            throw new SchemaValidationError(`Validation failed for ${filePath || '/temp'} ${JSON.stringify(ajv.errors)}`);
        }
    },

    async transformSchema({
        schema,
        domain,
        jsonRefsOptions = {},
    }) {
        schema = typeof schema === 'string' ? JSON.parse(schema) : schema;
        const fullBase = `${conf.baseUrl}:${conf.port}${conf.apiBase}`;

        // default settings

        jsonRefsOptions.loaderOptions = {
            ...{
                prepareRequest(req, cb) {
                    req.header['content-type'] = 'application/schema+json';
                    cb(undefined, req);
                },
                async processContent(res, cb) {
                    let error;
                    if (res.location.match('http')
                        && !res.location.match(conf.baseUrl)
                    ) {
                        console.log('process content');

                        try {
                            await processExternalSchema({
                                domain,
                                schema: JSON.parse(res.text),
                                jsonRefsOptions,
                            });
                        } catch (err) {
                            error = err;
                        }
                    }
                    cb(error, JSON.parse(res.text));
                },
            },
            ...jsonRefsOptions.loaderOptions,
        };

        const { refs } = await JsonRefs.resolveRefs(schema, jsonRefsOptions);
        const copy = { ...schema };
        let uri = '';
        const backReferences = [];
        // rewrite id
        if (copy.$id) {
            uri = transformURI({ id: copy.$id, domain, options: jsonRefsOptions });
            copy.$id = `${fullBase}/${uri}`;
        } else if (copy.id) {
            uri = transformURI({ id: copy.id, domain, options: jsonRefsOptions });
            copy.id = `${fullBase}/${uri}`;
        }

        for (const key of Object.keys(refs)) {
            const refObj = refs[key];
            const { uriDetails } = refObj;
            if (refObj.error) {
                // return original id
                const id = schema.$id || schema.id || 'no-id';
                throw (new SchemaReferenceError(`${refObj.error} in ${id}`));
            } else if (!uriDetails.scheme && uriDetails.path) {
                if (!jsonRefsOptions.root) {
                    throw (new SchemaReferenceError(`${uriDetails.path} invalid. No relative refs allowed.`));
                }
                let transformedPath = uriDetails.path;

                const normalizedPath = path.normalize(uriDetails.path);

                transformedPath = `${conf.apiBase}/domains/${domain}/schemas${resolveRelativePath({
                    filePath: normalizedPath,
                    location: jsonRefsOptions.location,
                    root: jsonRefsOptions.root,
                })}`;

                JsonPointer.set(
                    copy,
                    key.replace('#', ''),
                    {
                        $ref: `${conf.baseUrl}:${conf.port}${transformedPath}${uriDetails.fragment ? `#${uriDetails.fragment}` : ''}`,
                    },
                );
                backReferences.push(transformedPath);
            } else if (`${uriDetails.scheme}://${uriDetails.host}:${uriDetails.port}` === `${conf.baseUrl}:${conf.port}`) {
                backReferences.push(uriDetails.path);
            }
        }

        return {
            schema: copy,
            backReferences,
        };
    },

    resolveRelativePath,
    transformURI,
    URIfromId,
};
