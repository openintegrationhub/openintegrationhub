
const assert = require('assert');


const validateIAM = (iam) => {
    assert.ok(iam.middleware, 'iam.middleware missing');
    assert.equal(iam.middleware.length, 3, 'iam.middleware must have req, res, next arguments');

    assert.ok(iam.hasOneOf, 'iam.hasOneOf missing');
    assert.ok(iam.can, 'iam.can missing');
    assert.ok(iam.hasAll, 'iam.hasAll missing');
    assert.ok(iam.userIsOwnerOfSecret, 'iam.userIsOwnerOfSecret missing');
    assert.equal(iam.userIsOwnerOfSecret.length, 3, 'iam.userIsOwnerOfSecret must have req, res, next arguments');

    assert.ok(iam.userIsOwnerOfAuthClient, 'iam.userIsOwnerOfAuthClient missing');
    assert.equal(iam.userIsOwnerOfAuthClient.length, 3, 'iam.userIsOwnerOfAuthClient must have req, res, next arguments');

    return iam;
};


module.exports = {

    validateIAM,

};
