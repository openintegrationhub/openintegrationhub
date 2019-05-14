const { ComponentsDao } = require('@openintegrationhub/component-orchestrator');
const request = require('request');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');

class OIHComponentsDao extends ComponentsDao {
    constructor({config, logger}) {
        super();
        this._config = config;
        this._logger = logger;
    }

    async findById(compId) {
        const url = this._getComponentRepoUrl(`/components/${compId}`);

        return new Promise((resolve, reject) => {
            const opts = {
                url,
                json: true,
                headers: {
                    authorization: `Bearer ${this._config.get('IAM_TOKEN')}`
                }
            };

            this._logger.trace(opts, 'Fetching component info');

            request.get(opts, (err, response, body) => {
                if (err) {
                    this._logger.error({err}, 'Got error');
                    return reject(err);
                }

                const { statusCode } = response;
                this._logger.trace({body, statusCode}, 'Got response');

                if (statusCode === 200) {
                    return resolve(_.get(body, 'data'));
                }

                if (statusCode === 404) {
                    return resolve(null);
                }

                return reject(new Error('Failed to fetch a component'));
            });
        });
    }

    _getComponentRepoUrl(p) {
        const url = new URL(this._config.get('COMPONENT_REPOSITORY_BASE_URL'));
        url.pathname = path.join(url.pathname, p);
        return url.toString();
    }
}

module.exports = OIHComponentsDao;
