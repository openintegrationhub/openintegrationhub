const Q = require('q');
const request = require('request');

exports.getMetaModel = getMetaModel;

function getMetaModel(cfg) {
    return Promise.resolve({
        in: {
            type: 'object',
            properties: {
                email: {
                    type: 'string',
                    title: 'E-Mail'
                }
            }
        }
    });
}
