const Q = require('q');
const request = require('request');

exports.getMetaModel = getMetaModel;

function getMetaModel(cfg) {
    return Promise.reject(new Error('Today no metamodels. Sorry!'));
}
