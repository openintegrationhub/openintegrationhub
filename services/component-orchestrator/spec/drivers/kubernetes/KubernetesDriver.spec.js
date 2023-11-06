const KubernetesDriver = require('../../../src/drivers/kubernetes/KubernetesDriver');
const Secret = require('../../../src/drivers/kubernetes/Secret');
const KubernetesRunningComponent = require('../../../src/drivers/kubernetes/KubernetesRunningComponent');
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;

describe('KubernetesDriver', () => {
    let driver;
    let coreClient;
    let appsClient;

    beforeEach(() => {
        const config = {
            NAMESPACE: 'flows-ns',
            DEFAULT_CPU_LIMIT: '0.1',
            DEFAULT_MEM_LIMIT: '512',
            DEFAULT_CPU_REQUEST: '0.1',
            DEFAULT_MEM_REQUEST: '256',
            get(key) {
                return this[key];
            },
        };
        const logger = {
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
        };

        coreClient = {
            services: {
                post: () => {},
            },
        };

        appsClient = {
            deployments: {
                post: () => {},
            },
        };

        const k8s = {
            getCoreClient: () => coreClient,
            getAppsClient: () => appsClient,
        };

        sinon.stub(appsClient.deployments, 'post').resolves();
        sinon.stub(coreClient.services, 'post').resolves();

        driver = new KubernetesDriver({ config, logger, k8s });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#createApp', () => {
        it('should deploy a new app into K8s', async () => {
            const secret = new Secret();
            sinon.stub(driver, '_prepareEnvVars').returns({ container: 'env-vars' });
            sinon.stub(driver, '_ensureSecret').resolves(secret);
            sinon.stub(driver, '_createRunningComponent').resolves();

            const flow = { id: 'flow1' };
            const node = { id: 'node1' };

            const localComponent = { isGlobal: false };
            const globalComponent = { isGlobal: true, id: 'fooo' };

            const envVars = { env: 'lololo' };
            await driver.createApp({ flow, node, component: localComponent, envVars });

            expect(driver._prepareEnvVars).to.have.been.calledWith(envVars);
            expect(driver._ensureSecret).to.have.been.calledWith(`local-${flow.id}${node.id}`, {
                container: 'env-vars',
            });
            expect(driver._createRunningComponent).to.have.been.calledWith({
                flow,
                node,
                secret,
                component: localComponent,
                options: undefined,
            });

            await driver.createApp({ flow, node, component: globalComponent, envVars });

            expect(driver._prepareEnvVars).to.have.been.calledWith(envVars);
            expect(driver._ensureSecret).to.have.been.calledWith(`global-${globalComponent.id}`, {
                container: 'env-vars',
            });
            expect(driver._createRunningComponent).to.have.been.calledWith({
                secret,
                component: globalComponent,
                options: undefined,
            });
        });
    });

    describe('#_createRunningFlowNode', () => {
        it('should create RunningFlowNode instance', async () => {
            sinon.stub(driver, '_generateDeploymentDefinition').returns({ kind: 'Deployment' });
            sinon.stub(driver, '_generateServiceDefinition').returns({ kind: 'Service' });
            appsClient.deployments.post.resolves({
                body: {
                    kind: 'Deployment',
                    metadata: {
                        name: 'new-deployment',
                    },
                },
            });
            coreClient.services.post.resolves({
                body: {
                    kind: 'Service',
                    metadata: {
                        name: 'new-service',
                    },
                },
            });

            const flow = { id: 'flow1' };
            const node = { id: 'node1' };
            const secret = { id: 'secret' };

            const localComponent = { isGlobal: false };
            const globalComponent = {
                isGlobal: true,
                id: 'fooo',
                descriptor: {
                    restAPI: true,
                },
            };

            let result = await driver._createRunningComponent({
                flow,
                node,
                secret,
                component: localComponent,
                options: {},
            });
            expect(result instanceof KubernetesRunningComponent).to.be.true;
            expect(result.name).to.equal('new-deployment');

            result = await driver._createRunningComponent({
                flow,
                node,
                secret,
                component: globalComponent,
                options: {},
            });
            expect(result instanceof KubernetesRunningComponent).to.be.true;
            expect(result.name).to.equal('new-deployment');
        });
    });

    describe('#_generateAppDefinition', () => {
        it('should generate app descriptor', async () => {
            const flow = {
                id: 'flow1',
            };
            const node = {
                id: 'step1',
                componentId: '123',
                function: 'testAction',
            };
            const secret = {
                metadata: {
                    name: 'my-secret',
                },
            };
            const localComponent = {
                id: 'comp1',
                isGlobal: false,
                distribution: {
                    type: 'docker',
                    image: 'openintegrationhub/email',
                },
            };

            const globalComponent = {
                id: 'comp2',
                isGlobal: true,
                distribution: {
                    type: 'docker',
                    image: 'openintegrationhub/email',
                },
                descriptor: {
                    restAPI: true,
                },
            };

            let result = await driver._generateDeploymentDefinition({
                flow,
                node,
                secret,
                component: localComponent,
                options: {
                    replicas: 3,
                },
            });

            expect(result).to.deep.equal({
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                metadata: {
                    annotations: {
                        flowId: 'flow1',
                        nodeId: 'step1',
                        stepId: 'step1',
                        type: 'local',
                    },
                    name: 'local-flow1.step1',
                    namespace: 'flows-ns',
                },
                spec: {
                    replicas: 3,
                    selector: {
                        matchLabels: {
                            flowId: 'flow1',
                            stepId: 'step1',
                        },
                    },
                    template: {
                        metadata: {
                            labels: {
                                flowId: 'flow1',
                                stepId: 'step1',
                            },
                            annotations: {
                                flowId: 'flow1',
                                nodeId: 'step1',
                                stepId: 'step1',
                                type: 'local',
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    envFrom: [
                                        {
                                            secretRef: {
                                                name: 'my-secret',
                                            },
                                        },
                                    ],
                                    image: 'openintegrationhub/email',
                                    imagePullPolicy: 'Always',
                                    name: 'apprunner',
                                    resources: {
                                        limits: {
                                            cpu: '0.1',
                                            memory: '512',
                                        },
                                        requests: {
                                            cpu: '0.1',
                                            memory: '256',
                                        },
                                    },
                                    volumeMounts: [],
                                },
                            ],
                            volumes: [],
                        },
                    },
                },
            });

            result = await driver._generateDeploymentDefinition({
                flow,
                node,
                secret,
                component: globalComponent,
            });

            expect(result).to.deep.equal({
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                metadata: {
                    annotations: {
                        componentId: globalComponent.id,
                        type: 'global',
                    },
                    name: `global-${globalComponent.id}`,
                    namespace: 'flows-ns',
                },
                spec: {
                    replicas: 1,
                    selector: {
                        matchLabels: {
                            componentId: globalComponent.id,
                        },
                    },
                    template: {
                        metadata: {
                            labels: {
                                componentId: globalComponent.id,
                            },
                            annotations: {
                                componentId: globalComponent.id,
                                type: 'global',
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    envFrom: [
                                        {
                                            secretRef: {
                                                name: 'my-secret',
                                            },
                                        },
                                    ],
                                    image: 'openintegrationhub/email',
                                    imagePullPolicy: 'Always',
                                    name: 'apprunner',
                                    resources: {
                                        limits: {
                                            cpu: '0.1',
                                            memory: '512',
                                        },
                                        requests: {
                                            cpu: '0.1',
                                            memory: '256',
                                        },
                                    },
                                    volumeMounts: [],
                                },
                            ],
                            volumes: [],
                        },
                    },
                },
            });

            result = await driver._generateServiceDefinition({
                flow,
                node,
                component: globalComponent,
            });

            expect(result).to.deep.equal({
                apiVersion: 'v1',
                kind: 'Service',
                metadata: {
                    labels: {
                        app: 'global-comp2-service',
                    },
                    name: 'global-comp2-service',
                    namespace: 'flows-ns',
                },
                spec: {
                    ports: [
                        {
                            name: '3001',
                            port: 3001,
                            protocol: 'TCP',
                            targetPort: 3001,
                        },
                    ],
                    selector: {
                        componentId: 'comp2',
                    },
                    type: 'ClusterIP',
                },
            });
        });
    });
});
