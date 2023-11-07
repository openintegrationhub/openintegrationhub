const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;

const KubernetesRunningComponent = require('../../../src/drivers/kubernetes/KubernetesRunningComponent');

describe('KubernetesRunningNode', () => {
    describe('getters', () => {
        let rn;

        beforeEach(() => {
            rn = new KubernetesRunningComponent({
                apiVersion: 'batch/v1',
                kind: 'Job',
                metadata: {
                    name: 'Test node 1',
                    namespace: 'test-namespace',
                    uid: 'my-awesome-uid',
                    annotations: {
                        flowId: 'flow1',
                        nodeId: 'step_1',
                    },
                    ownerReferences: [
                        {
                            apiVersion: 'elastic.io/v1',
                            kind: 'Flow',
                            controller: true,
                            name: 'Flow 1',
                            uid: 'custom-uuid',
                        },
                    ],
                },
                spec: {
                    template: {
                        metadata: {
                            labels: {},
                        },
                        spec: {
                            restartPolicy: 'Never',
                            containers: [
                                {
                                    image: 'my-custom-docker-image',
                                    name: 'apprunner',
                                    imagePullPolicy: 'Always',
                                    envFrom: [
                                        {
                                            secretRef: {
                                                name: 'secret-name',
                                            },
                                        },
                                    ],
                                    env: [{ name: 'MY_ENV', value: 'my-secret-value' }],
                                    resources: {},
                                },
                            ],
                        },
                    },
                },
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

        it('name', () => {
            expect(rn.name).to.equal('Test node 1');
        });

        it('uid', () => {
            expect(rn.uid).to.equal('my-awesome-uid');
        });

        it('kind', () => {
            expect(rn.kind).to.equal('Job');
        });

        it('apiVersion', () => {
            expect(rn.apiVersion).to.equal('batch/v1');
        });

        describe('#getEnvVar', () => {
            it('should return env var', () => {
                expect(rn.getEnvVar('MY_ENV')).to.equal('my-secret-value');
            });

            it('should return null if not found', () => {
                expect(rn.getEnvVar('NOT_EXISTS')).to.be.null;
            });
        });
    });
});
