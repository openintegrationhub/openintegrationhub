const logger = require('bunyan').createLogger({ name: 'test' });
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const ComponentOrchestrator = require('../src/ComponentOrchestrator');
const Flow = require('../src/models/Flow');

describe('ComponentOrchestrator', () => {
    let rc;
    let config;
    let rabbitmqManagement;
    let flowsDao;
    let componentsDao;
    let tokensDao;
    let driver;
    let queuesManager;
    let eventBus;

    function createConfig(conf = {}) {
        return {
            get: (key) => conf[key],
        };
    }

    beforeEach(() => {
        config = createConfig();

        rabbitmqManagement = {
            getQueues: () => {},
            getExchanges: () => {},
            getBindings: () => {},
            createFlowUser: () => {},
            deleteUser: () => {},
        };
        sinon.stub(rabbitmqManagement, 'deleteUser').resolves();
        sinon.stub(rabbitmqManagement, 'createFlowUser').resolves();
        sinon.stub(rabbitmqManagement, 'getQueues').resolves([]);
        sinon.stub(rabbitmqManagement, 'getExchanges').resolves([]);
        sinon.stub(rabbitmqManagement, 'getBindings').resolves([]);

        flowsDao = {
            findAll: () => {},
        };
        sinon.stub(flowsDao, 'findAll').resolves();

        componentsDao = {
            findById: () => {},
        };
        sinon.stub(componentsDao, 'findById').resolves();

        tokensDao = {
            getTokenForFlowAndUser() {},
            deleteTokenForFlowAndUser() {},
        };
        sinon.stub(tokensDao, 'getTokenForFlowAndUser').resolves();
        sinon.stub(tokensDao, 'deleteTokenForFlowAndUser').resolves();

        driver = {
            getAppList: () => {},
            createApp: () => {},
            destroyApp: () => {},
        };
        sinon.stub(driver, 'getAppList').resolves();
        sinon.stub(driver, 'createApp').resolves();
        sinon.stub(driver, 'destroyApp').resolves();

        queuesManager = {
            createForFlow: () => {},
            // updateForFlow: () => {},
            deleteForFlow: () => {},
            getSettingsForNodeExecution: () => {},
            prepareQueues: () => {},
        };
        // sinon.stub(queuesManager, 'createForFlow').resolves();
        // sinon.stub(queuesManager, 'updateForFlow').resolves();
        sinon.stub(queuesManager, 'deleteForFlow').resolves();
        sinon.stub(queuesManager, 'getSettingsForNodeExecution').resolves();
        sinon.stub(queuesManager, 'prepareQueues').resolves();

        eventBus = {
            publish: () => {},
        };
        sinon.stub(eventBus, 'publish').resolves();

        rc = new ComponentOrchestrator({
            config,
            logger,
            rabbitmqManagement,
            queuesManager,
            flowsDao,
            componentsDao,
            tokensDao,
            driver,
            eventBus,
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#_processState', () => {
        it('should process system state', async () => {
            const apps = [{ id: 'flow1.step1' }];
            const flows = [{ id: 'flow1' }, { id: 'flow2' }];
            const jobIndex = {};

            driver.getAppList.resolves(apps);
            flowsDao.findAll.resolves(flows);
            sinon.stub(rc, '_buildDeploymentIndex').resolves(jobIndex);
            sinon.stub(rc, '_handleFlowState').resolves();
            sinon.stub(rc, '_removeLostDeployments').resolves();

            await rc._processState();
            expect(driver.getAppList).to.have.been.calledOnce;
            expect(flowsDao.findAll).to.have.been.calledOnce;
            expect(rc._buildDeploymentIndex).to.have.been.calledOnceWithExactly(apps);
            expect(rc._removeLostDeployments).to.have.been.calledOnceWithExactly(apps, flows);
            expect(rc._handleFlowState).to.have.been.calledTwice;
            expect(rc._handleFlowState.firstCall.args).to.deep.equal([flows[0], jobIndex]);
            expect(rc._handleFlowState.secondCall.args).to.deep.equal([flows[1], jobIndex]);
        });
    });

    describe('#_handleFlowState', () => {
        describe('for stopping flow', () => {
            it('should delete queues and running apps', async () => {
                const flow = new Flow({
                    id: 'flow1',
                    graph: {
                        nodes: [{ id: 'step1' }],
                    },
                    status: 'stopping',
                    startedBy: 'john-travolta',
                });
                sinon.stub(flow, 'onStopped').resolves();

                const appsIndex = {
                    flow1: {
                        step1: { id: 'flow1.step1' },
                    },
                };

                sinon.stub(rc, '_deleteRunningDeploymentsForFlow').resolves();

                await rc._handleFlowState(flow, appsIndex);

                expect(rc._deleteRunningDeploymentsForFlow).to.have.been.calledOnceWithExactly(flow, appsIndex);
                expect(queuesManager.deleteForFlow).to.have.been.calledOnceWithExactly(flow);
                expect(tokensDao.deleteTokenForFlowAndUser).to.have.been.calledOnceWithExactly({
                    flowId: flow.id,
                    userId: flow.startedBy,
                });

                expect(eventBus.publish).to.have.been.calledOnce;
                const event = eventBus.publish.firstCall.args[0];
                expect(event.name).to.equal('flow.stopped');
                expect(event.payload).to.deep.equal({ id: flow.id });

                expect(flow.onStopped).to.have.been.calledOnce;
            });
        });

        describe('for starting flow', () => {
            it('should ensure running nodes', async () => {
                const flow = new Flow({
                    id: 'flow1',
                    graph: {
                        nodes: [{ id: 'step1' }, { id: 'step2' }],
                    },
                    status: 'starting',
                    startedBy: 'michael-jackson',
                });

                sinon.stub(flow, 'preparingBy').resolves(true);
                sinon.stub(flow, 'onStarted').resolves();

                const appsIndex = {
                    flow1: {
                        step1: { id: 'flow1.step1' },
                    },
                };
                const queuesStructure = {
                    flow1: {
                        queues: ['flow1:step1', 'flow1:step2'],
                        exchanges: ['flow1'],
                        bindings: [{ destination: 'flow1:step2' }],
                    },
                };
                const component = {
                    id: 'test',
                    distribution: {
                        type: 'docker',
                        image: 'openintegrationhub/email',
                    },
                };

                componentsDao.findById.resolves(component);

                sinon.stub(rc, '_deleteRunningDeploymentsForFlow').resolves();

                queuesManager.getSettingsForNodeExecution.resolves({
                    SOME: 'env',
                });

                tokensDao.getTokenForFlowAndUser.resolves('my-long-iam-token');

                await rc._handleFlowState(flow, appsIndex, queuesStructure);

                //normal flow
                expect(queuesManager.getSettingsForNodeExecution).to.have.been.calledOnceWithExactly(
                    flow,
                    { id: 'step2' },
                    undefined
                );
                expect(tokensDao.getTokenForFlowAndUser).to.have.been.calledOnceWithExactly({
                    flowId: flow.id,
                    userId: flow.startedBy,
                });
                expect(driver.createApp).to.have.been.calledOnceWithExactly({
                    flow,
                    node: { id: 'step2' },
                    envVars: { SOME: 'env' },
                    component,
                    options: { imagePullPolicy: undefined, replicas: 1 },
                });

                expect(eventBus.publish).to.have.been.calledOnce;
                const event = eventBus.publish.firstCall.args[0];
                expect(event.name).to.equal('flow.started');
                expect(event.payload).to.deep.equal({ id: flow.id });

                expect(flow.onStarted).to.have.been.calledOnce;
            });

            it('should not fail if failed to get an IAM token', async () => {
                const flow = new Flow({
                    id: 'flow1',
                    graph: {
                        nodes: [{ id: 'step1' }, { id: 'step2' }],
                    },
                    status: 'starting',
                    startedBy: 'michael-jackson',
                });
                sinon.stub(flow, 'preparingBy').resolves(true);
                sinon.stub(flow, 'onStarted').resolves();

                const appsIndex = {
                    flow1: {
                        step1: { id: 'flow1.step1' },
                    },
                };
                const queuesStructure = {
                    flow1: {
                        queues: ['flow1:step1', 'flow1:step2'],
                        exchanges: ['flow1'],
                        bindings: [{ destination: 'flow1:step2' }],
                    },
                };
                const component = {
                    id: 'test',
                    distribution: {
                        type: 'docker',
                        image: 'openintegrationhub/email',
                    },
                };

                componentsDao.findById.resolves(component);

                sinon.stub(rc, '_deleteRunningDeploymentsForFlow').resolves();

                queuesManager.getSettingsForNodeExecution.resolves({
                    SOME: 'env',
                });

                tokensDao.getTokenForFlowAndUser.rejects(new Error('Cant create'));

                await rc._handleFlowState(flow, appsIndex, queuesStructure);

                //normal flow
                expect(queuesManager.getSettingsForNodeExecution).to.have.been.calledOnceWithExactly(
                    flow,
                    { id: 'step2' },
                    undefined
                );

                expect(tokensDao.getTokenForFlowAndUser).to.have.been.calledOnceWithExactly({
                    flowId: flow.id,
                    userId: flow.startedBy,
                });

                expect(driver.createApp).to.have.been.calledOnceWithExactly({
                    flow,
                    node: { id: 'step2' },
                    envVars: { SOME: 'env' },
                    component,
                    options: { imagePullPolicy: undefined, replicas: 1 },
                });

                expect(eventBus.publish).to.have.been.calledOnce;
                const event = eventBus.publish.firstCall.args[0];
                expect(event.name).to.equal('flow.started');
                expect(event.payload).to.deep.equal({ id: flow.id });

                expect(flow.onStarted).to.have.been.calledOnce;
            });

            it('should send "flow.failed" and "component.failed" events, if one of the component deployments could not be created', async () => {
                const flow = new Flow({
                    id: 'flow1',
                    graph: {
                        nodes: [
                            { id: 'step1', componentId: 'test' },
                            { id: 'step2', componentId: 'test' },
                        ],
                    },
                    status: 'starting',
                    startedBy: 'michael-jackson',
                });
                sinon.stub(flow, 'onStarting').resolves();
                sinon.stub(flow, 'onStarted').resolves();

                const appsIndex = {
                    flow1: {
                        step1: { id: 'flow1.step1' },
                    },
                };
                const queuesStructure = {
                    flow1: {
                        queues: ['flow1:step1', 'flow1:step2'],
                        exchanges: ['flow1'],
                        bindings: [{ destination: 'flow1:step2' }],
                    },
                };
                const component = {
                    id: 'test',
                    distribution: {
                        type: 'docker',
                        image: 'openintegrationhub/email',
                    },
                };

                componentsDao.findById.resolves(component);

                sinon.stub(rc, '_deleteRunningDeploymentsForFlow').resolves();
                driver.createApp.rejects(new Error('Could not create deployment'));

                queuesManager.getSettingsForNodeExecution.resolves({
                    SOME: 'env',
                });

                tokensDao.getTokenForFlowAndUser.rejects(new Error('Cant create'));

                await rc._handleFlowState(flow, appsIndex, queuesStructure);

                //normal flow
                expect(queuesManager.getSettingsForNodeExecution).to.have.been.calledOnceWithExactly(
                    flow,
                    { id: 'step2', componentId: 'test' },
                    undefined
                );

                expect(tokensDao.getTokenForFlowAndUser).to.not.have.been.called;

                expect(driver.createApp).to.have.been.calledOnceWithExactly({
                    flow,
                    node: { id: 'step2', componentId: 'test' },
                    envVars: { SOME: 'env' },
                    component,
                    options: { imagePullPolicy: undefined, replicas: 1 },
                });

                expect(eventBus.publish).to.have.been.called;

                let event = eventBus.publish.firstCall.args[0];
                expect(event.name).to.equal('component.failed');
                expect(event.payload).to.deep.equal({ id: component.id });

                event = eventBus.publish.secondCall.args[0];
                expect(event.name).to.equal('flow.failed');
                expect(event.payload).to.deep.equal({ id: flow.id });

                expect(flow.onStarted).to.not.have.been.called;
            });
        });
    });

    describe('#_buildDeploymentIndex', () => {
        it('should return jobs index', () => {
            const app1 = {
                id: 'flow1.step1',
                flowId: 'flow1',
                nodeId: 'step1',
            };
            const app2 = {
                id: 'flow2.step1',
                flowId: 'flow2',
                nodeId: 'step1',
            };
            const result = rc._buildDeploymentIndex([app1, app2]);
            expect(result).to.deep.equal({
                flow1: {
                    step1: app1,
                },
                flow2: {
                    step1: app2,
                },
            });
        });
    });

    describe('#_deleteRunningDeploymentsForFlow', () => {
        it('should all running nodes', async () => {
            const flow = {
                id: 'flow1',
            };

            const allApps = [
                {
                    id: 'flow1.step1',
                    flowId: 'flow1',
                    nodeId: 'step1',
                },
                {
                    id: 'flow1.step2',
                    flowId: 'flow1',
                    nodeId: 'step2',
                },
                {
                    id: 'flow1.step3',
                    flowId: 'flow1',
                    nodeId: 'step3',
                },
            ];

            await rc._deleteRunningDeploymentsForFlow(flow, rc._buildDeploymentIndex(allApps));

            expect(driver.destroyApp).to.have.been.calledThrice;
            expect(driver.destroyApp.firstCall.args).to.deep.equal([allApps[0]]);
            expect(driver.destroyApp.secondCall.args).to.deep.equal([allApps[1]]);
            expect(driver.destroyApp.thirdCall.args).to.deep.equal([allApps[2]]);
        });
    });

    describe('#_removeLostDeployments', () => {
        it('should remove running nodes that are not presented in flows anymore', async () => {
            const allApps = [
                {
                    id: 'flow1.step1',
                    flowId: 'flow1',
                    nodeId: 'step1',
                },
                {
                    id: 'flow1.step2',
                    flowId: 'flow1',
                    nodeId: 'step2',
                },
                {
                    id: 'flow1.step3',
                    flowId: 'flow1',
                    nodeId: 'step3',
                },
            ];
            const allFlows = [
                {
                    id: 'flow1',
                    graph: {
                        nodes: [{ id: 'step1' }, { id: 'step2' }],
                    },
                },
                {
                    id: 'flow2',
                    graph: {
                        nodes: [{ id: 'step1' }],
                    },
                },
            ];

            await rc._removeLostDeployments(allApps, allFlows);

            expect(driver.destroyApp).to.have.been.calledOnceWithExactly(allApps[2]);
        });
    });

    describe('#_buildFlowsIndex', () => {
        it('should return flows index', () => {
            const flow1 = {
                id: 'flow1',
                graph: {
                    nodes: [{ id: 'step1' }, { id: 'step2' }],
                },
            };
            const flow2 = {
                id: 'flow2',
                graph: {
                    nodes: [{ id: 'step1' }, { id: 'step2' }, { id: 'step3' }],
                },
            };

            const result = rc._buildFlowsIndex([flow1, flow2]);
            expect(result).to.deep.equal({
                flow1: {
                    step1: { id: 'step1' },
                    step2: { id: 'step2' },
                },
                flow2: {
                    step1: { id: 'step1' },
                    step2: { id: 'step2' },
                    step3: { id: 'step3' },
                },
            });
        });
    });
});
