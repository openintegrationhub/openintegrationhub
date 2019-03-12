const fs = require('fs');
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

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', async (err, contents) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(contents));
            }
        });
    });
}

function URIfromId(id) {
    return url.parse(id).path;
}

function transformURI({ domain, id }) {
    let { pathname } = url.parse(id);
    // remove first slash if existing
    pathname = pathname[0] === '/' ? pathname.substr(1, pathname.length) : pathname;
    return `domains/${domain}/schemas/${pathname}`;
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

module.exports = {
    validateSchema({ schema, filePath }) {
        ajv.validateSchema(schema);
        if (ajv.errors) {
            throw new SchemaValidationError(`Validation failed for ${filePath || '/temp'} ${JSON.stringify(ajv.errors)}`);
        }
    },

    async transformSchema({
        schema,
        domain,
        jsonRefsOptions = {},
        isVirtual,
    }) {
        const baseUrl = `http://localhost:${conf.port}${conf.apiBase}`;

        jsonRefsOptions.loaderOptions = {
            ...{
                prepareRequest(req, callback) {
                    req.header['content-type'] = 'application/schema+json';
                    callback(undefined, req);
                },
            },
            ...jsonRefsOptions.loaderOptions,
        };

        const { refs } = await JsonRefs.resolveRefs(schema, jsonRefsOptions);
        const copy = { ...schema };
        let uri = '';
        // rewrite id
        if (copy.$id) {
            uri = transformURI({ id: copy.$id, domain });
            copy.$id = `${baseUrl}/${uri}`;
        } else if (copy.id) {
            uri = transformURI({ id: copy.$id, domain });
            copy.id = `${baseUrl}/${uri}`;
        }

        for (const key of Object.keys(refs)) {
            const refObj = refs[key];
            if (refObj.error) {
                throw (new SchemaReferenceError(`${refObj.error} in ${jsonRefsOptions.location || '/temp'}`));
            } else if (!refObj.uriDetails.scheme && refObj.uriDetails.path) {
                let transformedPath = refObj.uriDetails.path;

                if (!isVirtual) {
                    const normalizedPath = path.normalize(refObj.uriDetails.path);

                    transformedPath = `${baseUrl}/domains/${domain}/schemas${resolveRelativePath({
                        filePath: normalizedPath,
                        location: jsonRefsOptions.location,
                        root: jsonRefsOptions.root,
                    })}`;
                }

                JsonPointer.set(
                    copy,
                    key.replace('#', ''),
                    {
                        $ref: `${transformedPath}${refObj.uriDetails.fragment ? `#${refObj.uriDetails.fragment}` : ''}`,
                    },
                );
            }
        }

        return copy;
    },
    resolveRelativePath,
    transformURI,
    URIfromId,
    readFile,
};
