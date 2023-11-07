const { ComponentsDao } = require('@openintegrationhub/component-orchestrator');
const LRU = require('lru-cache');
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

        this._cache = new LRU({
            max: this._config.get('CACHE_COMPONENT_SIZE') || 50,
            maxAge: this._config.get('CACHE_COMPONENT_MAX_AGE') || 1000 * 60 * 5,
        });
    }

    async findById(compId) {
        if (this._config.get('CACHE_COMPONENT_IGNORE') !== 'true') {
            const cachedComponent = this._cache.get(compId);

            if (cachedComponent) {
                this._logger.trace({ compId }, 'Returning cached component');
                return cachedComponent;
            }
        }

        const url = this._getComponentRepoUrl(`/components/${compId}`);

        const opts = {
            url,
            json: true,
            headers: {
                authorization: `Bearer ${this._config.get('IAM_TOKEN')}`,
            },
        };

        this._logger.trace({ compId }, 'Fetching component info');
        const { body, statusCode } = await getAsync(opts);

        if (statusCode === 200) {
            let component = _.get(body, 'data');
            this._cache.set(compId, component);
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
