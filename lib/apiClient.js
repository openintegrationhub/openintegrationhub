var _ = require('lodash');
var Q = require('q');
var request = require('request');
var util = require('util');

var API_URI = process.env.API_URI;

exports.updateKeys = updateKeys;

function updateKeys(accountId, keys) {

    return Q.fcall(buildRequest)
        .then(sendRequest)
        .spread(checkResponse);

    function buildRequest(){
        if (_.isEmpty(API_URI)) {
            throw new Error('API_URI is missing!');
        }
        if (_.isEmpty(accountId)) {
            throw new Error('Failed to update keys: accountId is not provided!');
        }
        if (_.isEmpty(keys)) {
            throw new Error('Failed to update keys: keys are empty');
        }
        return {
            uri: API_URI + '/v1/accounts/' + accountId,
            json: true,
            body: {keys: keys}
        };
    }

    function sendRequest(params) {
        return Q.ninvoke(request, "put", params);
    }

    function checkResponse(response, body){
        if (response.statusCode !== 200) {
            throw new Error(util.format(
                'Failed to update keys: API server replied with status %s (%j)',
                response.statusCode, body
            ))
        }
    }
}

