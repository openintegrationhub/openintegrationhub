const fs = require('fs');
const JsonRefs = require('json-refs');
const JsonPointer = require('json-pointer');
const Ajv = require('ajv');

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

module.exports = {
    validateSchema(schema, path) {
        ajv.validateSchema(schema);
        if (ajv.errors) {
            throw new Error(`Validation failed for ${path} ${JSON.stringify(ajv.errors)}`);
        }
    },

    async transformSchema(schema, options) {
        const { refs } = await JsonRefs.resolveRefs(schema, options);
        const copy = { ...schema };
        for (const key of Object.keys(refs)) {
            const refObj = refs[key];
            if (refObj.error) {
                throw (new Error(`${refObj.error} in ${options.location}`));
            } else if (!refObj.uriDetails.scheme && refObj.uriDetails.path) {
                JsonPointer.set(copy, key.replace('#', ''), {
                    $ref: `http://localhost/domain/schema/${refObj.uriDetails.path}${refObj.uriDetails.fragment ? `#${refObj.uriDetails.fragment}` : ''}`,
                });
            }
        }
        return copy;
    },

    async processSchema(schema, path, options) {
        module.exports.validateSchema(schema, path);
        return await module.exports.transformSchema(schema, {
            ...options,
        });
    },
    async processSchemaFiles(paths) {
        const results = {};
        for (const path of paths) {
            const schema = await readFile(path);
            results[path] = await module.exports.processSchema(schema, path, {
                location: path,
            });
        }

        return results;
    },
    readFile,
};
