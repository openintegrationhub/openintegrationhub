// const fs = require('fs');
// const path = require('path');
const JsonRefs = require('json-refs');
const JsonPointer = require('json-pointer');
const Schema = require('../../model/Schema');


async function normalizeReferences(jsonObject, options) {
    const { refs } = await JsonRefs.resolveRefs(jsonObject, options);
    const copy = { ...jsonObject };
    for (const key of Object.keys(refs)) {
        const refObj = refs[key];
        if (refObj.missing) {
            // should throw
            console.log(refObj);
        } else if (!refObj.uriDetails.scheme && refObj.uriDetails.path) {
            // reqrite to uri
            console.log(key);

            JsonPointer.set(copy, key.replace('#', ''), {
                $ref: `http://localhost/domain/schema/${refObj.uriDetails.path}${refObj.uriDetails.fragment ? `#${refObj.uriDetails.fragment}` : ''}`,
            });
        }
    }
    return copy;
}

module.exports = {
    async importFromString(string) {
        // const domain = new Schema({ ...obj });
        // await domain.save();
        // return domain.toObject();
    },
    normalizeReferences,
};
