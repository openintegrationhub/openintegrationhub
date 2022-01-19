const request = require('request');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
const fetch = require('node-fetch')
const { promisify } = require('util');
const getAsync = promisify(request.get);

module.exports = class OIHSnapshotsDao {
    constructor({config, logger, iamClient}) {
        this._config = config;
        this._logger = logger;
        this._iamClient = iamClient
    }

    async findOne({flowId, stepId, auth}) {
        const logger = this._logger.child({flowId, stepId});
        const url = this._getSnapshotsServiceUrl(`/snapshots/flows/${flowId}/steps/${stepId}`);
        const opts = {
            url,
            json: true,
            timeout: 5000,
            headers: {
                authorization: `Bearer ${auth.token}`
            }
        };

        logger.trace({opts}, 'Fetching the snapshot');
        const { body, statusCode } = await getAsync(opts);

        if (statusCode === 200) {
            return _.get(body, 'data');
        }

        if (statusCode === 404) {
            return null;
        }

        logger.trace({statusCode, body}, 'Failed to get the snapshot');
        throw new Error(`Failed to fetch the snapshot ${flowId}:${stepId}`);
    }

    async deleteSnapshots(flowExecId) {
        let url = new URL(`${this._config.get('SNAPSHOTS_SERVICE_BASE_URL')}/snapshots`)
        url.search = new URLSearchParams({ flowExecId }).toString()

        return fetch(url, {
            method: 'DELETE',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this._iamClient.getToken()}`,
            },
          })
    }

    _getSnapshotsServiceUrl(p) {
        const url = new URL(this._config.get('SNAPSHOTS_SERVICE_BASE_URL'));
        url.pathname = path.join(url.pathname, p);
        return url.toString();
    }
};
