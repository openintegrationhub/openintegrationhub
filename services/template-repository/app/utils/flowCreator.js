const request = require('request');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
const config = require('../config/index');
const { promisify } = require('util');
const postAsync = promisify(request.post);

const log = require('../config/logger');


async function createFlow(flow) {

        const url = getFlowRepoUrl(`/flows`);

        const opts = {
            url,
            json: true,
            headers: {
                authorization: `Bearer ${config.iamToken}`
            },
            body: flow,
        };

        const { body, statusCode } = await postAsync(opts);
        log.info("Response Body: ",body);
        if (statusCode === 201) {
            let outFlow = _.get(body, 'data')
            log.info("Returning: ",outFlow);
            return outFlow;
        }

        if (statusCode === 404) {
            return null;
        }

        throw new Error(`Failed to create the flow`);
    }

function getFlowRepoUrl(p) {
        const url = new URL(config.flowRepositoryBaseUrl);
        url.pathname = path.join(url.pathname, p);
        return url.toString();
    }
//}

module.exports = { createFlow };
