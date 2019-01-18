const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;

const KubernetesRunningNode = require('../../../src/drivers/kubernetes/KubernetesRunningNode');

describe('KubernetesRunningNode', () => {
    describe('getters', () => {
        let rn;

        beforeEach(() => {
            rn = new KubernetesRunningNode({
                apiVersion: 'batch/v1',
                kind: 'Job',
                metadata: {
                    name: 'Test node 1',
                    namespace: 'test-namespace',
                    annotations: {
                        [KubernetesRunningNode.ANNOTATION_KEY]: '1.0.1',
                        flowId: 'flow1',
                        nodeId: 'step_1'
                    },
                    ownerReferences: [
                        {
                            apiVersion: 'elastic.io/v1',
                            kind: 'Flow',
                            controller: true,
                            name: 'Flow 1',
                            uid: 'custom-uuid'
                        }
                    ]
                },
                spec: {
                    template: {
                        metadata: {
                            labels: {}
                        },
                        spec: {
                            restartPolicy: 'Never',
                            containers: [{
                                image: 'my-custom-docker-image',
                                name: 'apprunner',
                                imagePullPolicy: 'Always',
                                envFrom: [{
                                    secretRef: {
                                        name: 'secret-name'
                                    }
                                }],
                                resources: {}
                            }]
                        }
                    }
                }
            });
        });

        it('id', () => {
            expect(rn.id).to.equal('Test node 1');
        });

        it('flowId', () => {
            expect(rn.flowId).to.equal('flow1');
        });

        it('nodeId', () => {
            expect(rn.nodeId).to.equal('step_1');
        });

        it('flowVersion', () => {
            expect(rn.flowVersion).to.equal('1.0.1');
        });
    });
});
