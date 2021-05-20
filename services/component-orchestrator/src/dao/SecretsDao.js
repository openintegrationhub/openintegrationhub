const fetch = require('node-fetch');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
// const { promisify } = require('util');
// const getAsync = promisify(request.get);

// NOT USED ANYMORE

module.exports = class OIHSecretsDao {
    constructor({ config, logger }) {
        this._config = config;
        this._logger = logger;
    }

    async findById(secretId, { auth }) {
      console.log('here!!!');
        const logger = this._logger.child({ secretId });
        const url = this._getSecretsServiceUrl(`/secrets/${secretId}`);
        // const opts = {
        //     url,
        //     json: true,
        //     timeout: 5000,
        //     headers: {
        //         authorization: `Bearer ${auth.token}`
        //     }
        // };

        const options = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${auth.token}`,
            'Content-type': 'application/json',
          },
          timeout: 5000,
        };

        logger.trace({ options }, 'Fetching the secret');
        // const { body, statusCode } = await getAsync(opts);

        const response = await fetch(url, options);

        let body = null;
        try {
          body = await response.json();
        } catch (e) {
          console.log(e);
        }

        if (response.status === 200 && body) {
            return _.get(body, 'data');
        }

        if (response.status === 404) {
            return null;
        }

        logger.trace({ status, body }, 'Failed to get the secret');
        throw new Error(`Failed to fetch the secret ${secretId}`);
    }

    _getSecretsServiceUrl(p) {
        const url = new URL(this._config.get('SECRET_SERVICE_BASE_URL'));
        url.pathname = path.join(url.pathname, p);
        return url.toString();
    }
};
