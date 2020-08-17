const { ComponentsDao } = require('@openintegrationhub/component-orchestrator');
const request = require('request');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
const { promisify } = require('util');
const getAsync = promisify(request.get);

class OIHComponentsDao extends ComponentsDao {
    constructor({ config, logger }) {
        super();
        this._config = config;
        this._logger = logger;
    }

    async findById(compId) {
        const url = this._getComponentRepoUrl(`/components/${compId}`);
        const opts = {
            url,
            json: true,
            headers: {
                authorization: `Bearer ${this._config.get('IAM_TOKEN')}`
            }
        };
        this._logger.trace({ compId }, 'Fetching component info');
        const { body, statusCode } = await getAsync(opts);

        if (statusCode === 200) {
            return _.get(body, 'data');
        }

        if (statusCode === 404) {
            return null;
        }

        throw new Error(`Failed to fetch the component ${compId}`);
    }

    _getComponentRepoUrl(p) {
        const url = new URL(this._config.get('COMPONENT_REPOSITORY_BASE_URL'));
        url.pathname = path.join(url.pathname, p);
        return url.toString();
    }
}

module.exports = OIHComponentsDao;
