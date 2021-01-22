const request = require('request');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
const { promisify } = require('util');
const config = require('../config/index');

const postAsync = promisify(request.post);

const log = require('../config/logger');

function getFlowRepoUrl(p) {
  const url = new URL(config.flowRepositoryBaseUrl);
  url.pathname = path.join(url.pathname, p);
  return url.toString();
}

async function createFlow(flow, auth) {
  const url = getFlowRepoUrl('/flows');

  const opts = {
    url,
    json: true,
    headers: {
      authorization: auth,
    },
    body: flow,
  };

  const { body, statusCode } = await postAsync(opts);
  log.info('Response Body: ', body);
  if (statusCode === 201) {
    const outFlow = _.get(body, 'data');
    log.info('Returning: ', outFlow);
    return outFlow;
  }

  if (statusCode === 404) {
    return null;
  }

  throw new Error('Failed to create the flow');
}

module.exports = { createFlow };
