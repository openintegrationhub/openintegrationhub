var _ = require('lodash');
var Q = require('q');
var request = require('request');
var util = require('util');

function ApiClient(uri) {
    this.API_URI = uri;
}

ApiClient.prototype.auth = function auth(email, secret) {
    this.auth = {
        username: email,
        password: secret
    };
    return this;
};

ApiClient.prototype.updateKeys = function updateKeys(accountId, keys) {
    if (_.isEmpty(accountId)) {
        return reject('Failed to update keys: accountId is not provided!');
    }
    if (_.isEmpty(keys)) {
        return reject('Failed to update keys: keys are empty');
    }
    return this.put('/v1/accounts/' + accountId, {keys: keys}, [200]);
};

ApiClient.prototype.put = function put(path, data, expectedCodes) {
    var params = {
        uri: this.API_URI + path,
        json: true,
        body: data,
        auth: this.auth
    };
    return Q.ninvoke(request, 'put', params)
        .spread(checkResponse.bind(null, expectedCodes));
};

function checkResponse(expectedCodes, response, body) {
    if (expectedCodes.indexOf(response.statusCode) === -1) {
        return reject(util.format(
            'Failed to update keys: API server replied with status %s (%j)',
            response.statusCode, body
        ));
    }
}

function reject(message) {
    return Q.reject(new Error(message));
}

module.exports = ApiClient;
