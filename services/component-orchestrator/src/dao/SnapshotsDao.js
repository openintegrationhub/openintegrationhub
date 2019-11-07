const request = require('request');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
const { promisify } = require('util');
const getAsync = promisify(request.get);

module.exports = class OIHSnapshotsDao {
    constructor({config, logger}) {
        this._config = config;
        this._logger = logger;
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

    _getSnapshotsServiceUrl(p) {
        const url = new URL(this._config.get('SNAPSHOTS_SERVICE_BASE_URL'));
        url.pathname = path.join(url.pathname, p);
        return url.toString();
    }
};
