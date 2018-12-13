class Flow {
    constructor(crd) {
        this.id = crd.metadata.name;
        this.metadata = crd.metadata;
        Object.assign(this, crd.spec);
    }

    get isDeleted() {
        return !!this.metadata.deletionTimestamp;
    }

    get version() {
        return this.metadata.resourceVersion;
    }

    getFirstNode() {
        return this.nodes.find((step) => step.first);
    }

    getRecipeNodeByStepId(stepId) {
        return this.nodes.find((step) => step.id === stepId);
    }

    toCRD() {
        const spec = Object.assign({}, this);
        delete spec.id;
        delete spec.metadata;
        return {
            apiVersion: 'elastic.io/v1',
            kind: 'Flow',
            metadata: this.metadata,
            spec: spec
        };
    }
}
module.exports = Flow;
