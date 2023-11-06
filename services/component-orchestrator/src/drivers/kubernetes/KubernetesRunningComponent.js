const _ = require('lodash');
const { RunningComponent } = require('@openintegrationhub/component-orchestrator');

class KubernetesRunningComponent extends RunningComponent {
    constructor(app) {
        super();
        this._app = app;
    }

    get uid() {
        return this.getMetadataValue('uid');
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

    getType() {
        return this.getAnnotationsValue('type');
    }

    getFlowId() {
        return this.getAnnotationsValue('flowId');
    }

    getNodeId() {
        return this.getAnnotationsValue('nodeId');
    }

    getComponentId() {
        return this.getAnnotationsValue('componentId');
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

    getEnvVar(name) {
        const pair = this._getContainerEnv().find((pair) => pair.name === name);
        if (!pair) {
            return null;
        }
        return pair.value;
    }
}

module.exports = KubernetesRunningComponent;
