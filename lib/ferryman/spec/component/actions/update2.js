/* eslint no-unused-vars: 0 */ // --> OFF

const Q = require('q');
const request = require('request');


function getMetaModel(cfg) {
  return Promise.reject(new Error('Today no metamodels. Sorry!'));
}

exports.getMetaModel = getMetaModel;
