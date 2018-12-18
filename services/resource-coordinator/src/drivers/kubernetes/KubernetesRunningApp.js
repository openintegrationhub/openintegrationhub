const _ = require('lodash');
const { RunningApp } = require('@openintegrationhub/resource-coordinator');

class KubernetesRunningApp extends RunningApp {
    constructor(app) {
        super();
        this._app = app;
    }

    getId() {
        return this._getMetadataValue('name');
    }

    getFlowId() {
        return this._getEnvVar('ELASTICIO_FLOW_ID');
    }

    getNodeId() {
        return this._getEnvVar('ELASTICIO_STEP_ID');
    }

    // @todo: not sure yet if we need to expose this API
    get flowVersion() {
        return _.get(this._getMetadataValue('annotations'), this.constructor.ANNOTATION_KEY);
    }

    _getMetadataValue(key) {
        return _.get(this, `_app.metadata.${key}`);
    }

    _getContainerSpec() {
        return _.get(this, '_app.spec.template.spec.containers.0', {});
    }

    _getContainerEnv() {
        return _.get(this._getContainerSpec(), 'env', []);
    }

    _getEnvVar(name) {
        const pair = this._getContainerEnv().find(pair => pair.name === name);
        if (!pair) {
            return null;
        }
        return pair.value;
    }

    static get ANNOTATION_KEY() {
        return 'annotation.flows.elastic.io';
    }
}

module.exports = KubernetesRunningApp;
