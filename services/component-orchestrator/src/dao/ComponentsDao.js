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
        this._componentCache = {};
    }

    async findById(compId) {
        if (this._componentCache[compId] && new Date().getTime() < this._componentCache[compId].expires) {
            this._logger.trace({ compId }, 'Returning cached component');
            return this._componentCache[compId].component;
        }

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
            let component = _.get(body, 'data')
            this._componentCache[compId] = {
                expires: new Date().getTime() + 5*60000, // 5 minutes
                component: component
            };

            return component;
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
