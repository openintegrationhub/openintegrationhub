const { ComponentsDao } = require('@openintegrationhub/component-orchestrator');
const LRU = require('lru-cache')
const fetch = require('node-fetch');
const { URL } = require('url');
const path = require('path');
const _ = require('lodash');
// const { promisify } = require('util');
// const getAsync = promisify(request.get);

class OIHComponentsDao extends ComponentsDao {
    constructor({ config, logger }) {
        super();
        this._config = config;
        this._logger = logger;

        this._cache = new LRU({
            max: this._config.get('CACHE_COMPONENT_SIZE') || 50,
            maxAge: this._config.get('CACHE_COMPONENT_MAX_AGE') || 1000 * 60 * 5
        })
    }

    async findById(compId) {

        if (this._config.get('CACHE_COMPONENT_IGNORE') !== 'true') {
            const cachedComponent = this._cache.get(compId)

            if (cachedComponent) {
                this._logger.trace({ compId }, 'Returning cached component');
                return cachedComponent;
            }
        }

        const url = this._getComponentRepoUrl(`/components/${compId}`);

        this._logger.trace({ compId }, 'Fetching component info');

        const options = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${this._config.get('IAM_TOKEN')}`,
            'Content-type': 'application/json',
          },
        };

        const response = await fetch(url, options);

        let body = null;
        try {
          body = await response.json();
        } catch (e) {
          console.log(e);
        }

        if (response.status === 200 && body) {
            let component = _.get(body, 'data')
            this._cache.set(compId, component)
            return component;
        }

        if (response.status === 404) {
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
