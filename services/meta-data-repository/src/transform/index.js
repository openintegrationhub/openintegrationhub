const JsonRefs = require('json-refs');
const JsonPointer = require('json-pointer');
const Ajv = require('ajv');
const url = require('url');
const path = require('path');
// const find = require('lodash/find');
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
    const uriBase = `domains/${domain}/schemas`;

    // remove first slash if existing
    if (options.location) {
        pathname = options.location.replace(options.root, '');
    } else if (!pathname) {
        pathname = encodeURI(id).replace(/(#|\?)/g, '');
    }

    pathname = pathname.replace(`${conf.apiBase}/${uriBase}`, '');

    return `${uriBase}/${pathname}`.replace('//', '/');
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

async function processExternalSchema({
    location,
    domain,
    schema,
    jsonRefsOptions,
}) {
    module.exports.validateSchema({
        schema,
    });

    console.log(location);
    jsonRefsOptions.root = url.resolve(location, './');
    console.log(url.resolve(location, '../'));
    jsonRefsOptions.location = location;
    console.log(jsonRefsOptions);

    // jsonRefsOptions.root =
    console.log(await module.exports.transformSchema({
        domain,
        schema,
        jsonRefsOptions,
    }));
    console.log('schema processed');
}

function transformDbResult(result) {
    if (result._doc) {
        result = result._doc;
    }

    result = {
        ...result._id ? {
            id: result._id,
        } : {},
        ...result,
    };


    // delete keys
    delete result._id;
    delete result.__v;
    return result;
}

function transformDbResults(results) {
    if (typeof results === 'object') {
        if (Array.isArray(results)) {
            return results.map((entry) => (transformDbResult(entry)));
        }
        return transformDbResult(results);
    }
    return results;
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
        token,
    }) {
        schema = typeof schema === 'string' ? JSON.parse(schema) : schema;

        // default settings

        jsonRefsOptions.loaderOptions = {
            ...{
                prepareRequest(req, cb) {
                    req.header['content-type'] = 'application/schema+json';
                    if (token) {
                        req.header.Authorization = `Bearer ${token}`;
                    }

                    cb(undefined, req);
                },
                async processContent(res, cb) {
                    let error;
                    let schema;

                    try {
                        if (res.location.match('http')
                        && !res.location.match(conf.baseUrl)
                        ) {
                        //
                        }
                        schema = JSON.parse(res.text);
                    } catch (err) {
                        error = err;
                        // console.log(err);
                        // throw new InputFormatError('Incorrect input format. Expecting JSON');
                    } finally {
                        cb(error, schema);
                    }
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
            copy.$id = module.exports.buildSchemaURL(uri);
        } else if (copy.id) {
            uri = transformURI({ id: copy.id, domain, options: jsonRefsOptions });
            copy.id = module.exports.buildSchemaURL(uri);
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
                        $ref: `${module.exports.buildBaseUrl()}${transformedPath}${uriDetails.fragment ? `#${uriDetails.fragment}` : ''}`,
                    },
                );

                if (!backReferences.includes(transformedPath)) {
                    backReferences.push(transformedPath);
                }
            } else if (`${uriDetails.scheme}://${uriDetails.host}${conf.urlsWithPort ? `:${uriDetails.port}` : ''}` === `${module.exports.buildBaseUrl()}`) {
                if (!backReferences.includes(uriDetails.path)) {
                    backReferences.push(uriDetails.path);
                }
            }
        }

        return {
            schema: copy,
            backReferences,
        };
    },

    buildURI({ domainId, uri }) {
        return `${conf.apiBase}/domains/${domainId}/schemas/${uri}`;
    },


    buildBaseUrl() {
        return `${conf.baseUrl}${conf.urlsWithPort ? `:${conf.port}` : ''}`;
    },

    buildSchemaURL(uri) {
        return `${module.exports.buildBaseUrl()}${conf.apiBase}/${uri}`;
    },
    transformURI,
    transformDbResults,
    resolveRelativePath,
    URIfromId,
};
