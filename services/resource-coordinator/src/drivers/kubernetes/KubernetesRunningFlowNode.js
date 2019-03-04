const _ = require('lodash');
const { RunningFlowNode } = require('@openintegrationhub/resource-coordinator');

class KubernetesRunningFlowNode extends RunningFlowNode {
    constructor(app) {
        super();
        this._app = app;
    }

    get uid() {
        return this.getMetadataValue('uid')
    }

    get kind() {
        return this.getRootValue('kind');
    }

    get apiVersion() {
        return this.getRootValue('apiVersion');
    }

    get name() {
        return this.getMetadataValue('name');
    }

    getId() {
        return this.getMetadataValue('name');
    }

    getFlowId() {
        return this.getAnnotationsValue('flowId');
    }

    getNodeId() {
        return this.getAnnotationsValue('nodeId');
    }

    getAnnotationsValue(key) {
        return _.get(this, `_app.metadata.annotations.${key}`);
    }

    getMetadataValue(key) {
        return _.get(this, `_app.metadata.${key}`);
    }

    getRootValue(key) {
        return _.get(this, `_app.${key}`);
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
