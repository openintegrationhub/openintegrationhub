const request = require('request');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
const { promisify } = require('util');
const getAsync = promisify(request.get);

module.exports = class OIHSecretsDao {
    constructor({config, logger}) {
        this._config = config;
        this._logger = logger;
    }

    async findById(secretId) {
        const url = this._getSecretsServiceUrl(`/secrets/${secretId}`);
        const opts = {
            url,
            json: true,
            headers: {
                authorization: `Bearer ${this._config.get('IAM_TOKEN')}`
            }
        };

        this._logger.trace({secretId}, 'Fetching the secret');
        const { body, statusCode } = await getAsync(opts);

        if (statusCode === 200) {
            return _.get(body, 'data');
        }

        if (statusCode === 404) {
            return null;
        }

        throw new Error(`Failed to fetch the secret ${secretId}`);
    }

    _getSecretsServiceUrl(p) {
        const url = new URL(this._config.get('SECRETS_SERVICE_BASE_URL'));
        url.pathname = path.join(url.pathname, p);
        return url.toString();
    }
};
