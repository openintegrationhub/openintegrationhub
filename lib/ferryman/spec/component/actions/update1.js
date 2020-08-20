/* eslint no-unused-vars: 0 */ // --> OFF

const Q = require('q');
const request = require('request');


function getMetaModel(cfg) {
  return Promise.resolve({
    in: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          title: 'E-Mail',
        },
      },
    },
  });
}

exports.getMetaModel = getMetaModel;
