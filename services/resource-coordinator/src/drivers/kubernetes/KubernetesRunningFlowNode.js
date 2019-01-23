const _ = require('lodash');
const { RunningFlowNode } = require('@openintegrationhub/resource-coordinator');

class KubernetesRunningFlowNode extends RunningFlowNode {
    constructor(app) {
        super();
        this._app = app;
    }

    getId() {
        return this._getMetadataValue('name');
    }

    getFlowId() {
        return this._getAnnotationsValue('flowId');
    }

    getNodeId() {
        return this._getAnnotationsValue('nodeId');
    }

    // @todo: not sure yet if we need to expose this API
    get flowVersion() {
        return _.get(this._getMetadataValue('annotations'), this.constructor.ANNOTATION_KEY);
    }

    _getAnnotationsValue(key) {
        return _.get(this, `_app.metadata.annotations.${key}`);
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

module.exports = KubernetesRunningFlowNode;
