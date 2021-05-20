const fetch = require('node-fetch');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');

const config = require('../config/index');

const log = require('../config/logger');

function getFlowRepoUrl(p) {
  const url = new URL(config.flowRepositoryBaseUrl);
  url.pathname = path.join(url.pathname, p);
  return url.toString();
}

async function createFlow(flow, auth) {
  const url = getFlowRepoUrl('/flows');

  const options = {
    method: 'POST',
    headers: {
      authorization: auth,
      'Content-type': 'application/json',
    },
    body: JSON.stringify(flow),
  };

  const response = await fetch(url, options);
  const body = await response.json();
  log.info('Response Body: ', body);

  if (response.status === 201) {
    const outFlow = _.get(body, 'data');
    log.info('Returning: ', outFlow);
    return outFlow;
  }

  if (response.status === 404) {
    return null;
  }

  throw new Error('Failed to create the flow');
}

module.exports = { createFlow };
