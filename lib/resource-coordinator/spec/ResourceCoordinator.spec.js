const ResourceCoordinator = require('../src/ResourceCoordinator');
const logger = require('bunyan').createLogger({name: 'test'});
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;

class Flow {
    constructor(payload) {
        Object.assign(this, payload);
    }

    getNodes() {
        return this.graph.nodes;
    }
}

describe('ResourceCoordinator', () => {
    let rc;
    let config;
    let rabbitmqManagement;
    let flowsDao;
    let driver;
    let infrastructureManager;

    function createConfig(conf = {}) {
        return {
            get: key => conf[key]
        };
    }

    beforeEach(() => {
        config = createConfig();

        rabbitmqManagement = {
            getQueues: () => {},
            getExchanges: () => {},
            getBindings: () => {},
            createFlowUser: () => {},
            deleteUser: () => {}
        };
        sinon.stub(rabbitmqManagement, 'deleteUser').resolves();
        sinon.stub(rabbitmqManagement, 'createFlowUser').resolves();
        sinon.stub(rabbitmqManagement, 'getQueues').resolves([]);
        sinon.stub(rabbitmqManagement, 'getExchanges').resolves([]);
        sinon.stub(rabbitmqManagement, 'getBindings').resolves([]);

        flowsDao = {
            findAll: () => {}
        };
        sinon.stub(flowsDao, 'findAll').resolves();

        driver = {
            getAppList: () => {},
            createApp: () => {},
            destroyApp: () => {}
        };
        sinon.stub(driver, 'getAppList').resolves();
        sinon.stub(driver, 'createApp').resolves();
        sinon.stub(driver, 'destroyApp').resolves();

        infrastructureManager = {
            createForFlow: () => {},
            updateForFlow: () => {},
            deleteForFlow: () => {},
            getSettingsForNodeExecution: () => {}
        };
        sinon.stub(infrastructureManager, 'createForFlow').resolves();
        sinon.stub(infrastructureManager, 'updateForFlow').resolves();
        sinon.stub(infrastructureManager, 'deleteForFlow').resolves();
        sinon.stub(infrastructureManager, 'getSettingsForNodeExecution').resolves();

        rc = new ResourceCoordinator({
            config,
            logger,
            rabbitmqManagement,
            infrastructureManager,
            flowsDao,
            driver
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#_loopBody', () => {
        it('should do usual routine', async () => {
            const apps = [{id: 'flow1.step1'}];
            const flows = [{id: 'flow1'}];
            const qStructure = {};

            driver.getAppList.resolves(apps);
            flowsDao.findAll.resolves(flows);
            sinon.stub(rc, '_getQueuesStructure').resolves(qStructure);
            sinon.stub(rc, '_processState').resolves();

            await rc._loopBody();
            expect(driver.getAppList).to.have.been.calledOnce;
            expect(flowsDao.findAll).to.have.been.calledOnce;
            expect(rc._getQueuesStructure).to.have.been.calledOnce;
            expect(rc._processState).to.have.been.calledOnceWithExactly(flows, apps, qStructure);
        });
    });

    describe('#_processState', () => {
        it('should process system state', async () => {
            const apps = [{id: 'flow1.step1'}];
            const flows = [{id: 'flow1'}, {id: 'flow2'}];
            const qStructure = {};
            const jobIndex = {};

            sinon.stub(rc, '_buildJobIndex').resolves(jobIndex);
            sinon.stub(rc, '_handleFlow').resolves();
            sinon.stub(rc, '_removeLostJobs').resolves();

            await rc._processState(flows, apps, qStructure);

            expect(rc._buildJobIndex).to.have.been.calledOnceWithExactly(apps);
            expect(rc._removeLostJobs).to.have.been.calledOnceWithExactly(apps, flows);
            expect(rc._handleFlow).to.have.been.calledTwice;
            expect(rc._handleFlow.firstCall.args).to.deep.equal([flows[0], jobIndex, qStructure]);
            expect(rc._handleFlow.secondCall.args).to.deep.equal([flows[1], jobIndex, qStructure]);
        });
    });

    describe('#_handleFlow', () => {
        describe('for deleted flow', () => {
            it('should delete queues and running apps', async () => {
                const flow = new Flow({
                    id: 'flow1',
                    graph: {
                        nodes: [{id: 'step1'}]
                    },
                    status: 'stopping'
                });
                const appsIndex = {
                    flow1: {
                        step1: {id: 'flow1.step1'}
                    }
                };
                const queuesStructure = {
                    flow1: {
                        queues: ['flow1:step1'],
                        exchanges: ['flow1'],
                        bindings: [{destination: 'flow1:step2'}]
                    }
                };

                sinon.stub(rc, '_deleteRunningAppsForFlow').resolves();

                await rc._handleFlow(flow, appsIndex, queuesStructure);

                expect(rc._deleteRunningAppsForFlow).to.have.been.calledOnceWithExactly(flow, appsIndex);
                expect(infrastructureManager.deleteForFlow).to.have.been.calledOnceWithExactly(flow, queuesStructure);
            });
        });

        describe('for active flow', () => {
            it('should ensure running nodes', async () => {
                const flow = new Flow({
                    id: 'flow1',
                    graph: {
                        nodes: [
                            {id: 'step1'},
                            {id: 'step2'}
                        ]
                    }
                });
                const appsIndex = {
                    flow1: {
                        step1: {id: 'flow1.step1'}
                    }
                };
                const queuesStructure = {
                    flow1: {
                        queues: ['flow1:step1', 'flow1:step2'],
                        exchanges: ['flow1'],
                        bindings: [{destination: 'flow1:step2'}]
                    }
                };

                sinon.stub(rc, '_deleteRunningAppsForFlow').resolves();

                infrastructureManager.getSettingsForNodeExecution.resolves({
                    SOME: 'env'
                });

                await rc._handleFlow(flow, appsIndex, queuesStructure);

                //normal flow
                expect(infrastructureManager.getSettingsForNodeExecution).to.have.been.calledOnceWithExactly(flow, {id: 'step2'});
                expect(driver.createApp).to.have.been.calledOnceWithExactly(
                    flow,
                    {id: 'step2'},
                    {SOME: 'env'}
                );
            });
        });
    });

    describe('#_getQueuesStructure', () => {
        it('should return queues structure', async () => {
            const queues = [{name: 'flow1:step1'}];
            const exchanges = [{name: 'flow1'}];
            const bindings = [{destination: 'flow1:step2'}];

            rabbitmqManagement.getQueues.resolves(queues);
            rabbitmqManagement.getExchanges.resolves(exchanges);
            rabbitmqManagement.getBindings.resolves(bindings);

            const qs = await rc._getQueuesStructure();
            expect(qs).to.deep.equal({
                flow1: {
                    queues: ['flow1:step1'],
                    exchanges: ['flow1'],
                    bindings
                }
            });
        });
    });

    describe('#_buildJobIndex', () => {
        it('should return jobs index', () => {
            const app1 = {
                id: 'flow1.step1',
                flowId: 'flow1',
                nodeId: 'step1'
            };
            const app2 = {
                id: 'flow2.step1',
                flowId: 'flow2',
                nodeId: 'step1'
            };
            const result = rc._buildJobIndex([app1, app2]);
            expect(result).to.deep.equal({
                flow1: {
                    step1: app1
                },
                flow2: {
                    step1: app2
                }
            });
        });
    });

    describe('#_deleteRunningAppsForFlow', () => {
        it('should all running nodes', async () => {
            const flow = {
                id: 'flow1'
            };

            const allApps = [
                {
                    id: 'flow1.step1',
                    flowId: 'flow1',
                    nodeId: 'step1'
                },
                {
                    id: 'flow1.step2',
                    flowId: 'flow1',
                    nodeId: 'step2'
                },
                {
                    id: 'flow1.step3',
                    flowId: 'flow1',
                    nodeId: 'step3'
                }
            ];

            await rc._deleteRunningAppsForFlow(flow, rc._buildJobIndex(allApps));

            expect(driver.destroyApp).to.have.been.calledThrice;
            expect(driver.destroyApp.firstCall.args).to.deep.equal(['flow1.step1']);
            expect(driver.destroyApp.secondCall.args).to.deep.equal(['flow1.step2']);
            expect(driver.destroyApp.thirdCall.args).to.deep.equal(['flow1.step3']);
        });
    });

    describe('#_removeLostJobs', () => {
        it('should remove running nodes that are not presented in flows anymore', async () => {
            const allApps = [
                {
                    id: 'flow1.step1',
                    flowId: 'flow1',
                    nodeId: 'step1'
                },
                {
                    id: 'flow1.step2',
                    flowId: 'flow1',
                    nodeId: 'step2'
                },
                {
                    id: 'flow1.step3',
                    flowId: 'flow1',
                    nodeId: 'step3'
                }
            ];
            const allFlows = [
                {
                    id: 'flow1',
                    graph: {
                        nodes: [
                            {id: 'step1'},
                            {id: 'step2'}
                        ]
                    }
                },
                {
                    id: 'flow2',
                    graph: {
                        nodes: [
                            {id: 'step1'}
                        ]
                    }
                }
            ];

            await rc._removeLostJobs(allApps, allFlows);

            expect(driver.destroyApp).to.have.been.calledOnceWithExactly('flow1.step3');
        });
    });

    describe('#_buildFlowsIndex', () => {
        it('should return flows index', () => {
            const flow1 = {
                id: 'flow1',
                graph: {
                    nodes: [
                        {id: 'step1'},
                        {id: 'step2'},
                    ]
                }
            };
            const flow2 = {
                id: 'flow2',
                graph: {
                    nodes: [
                        {id: 'step1'},
                        {id: 'step2'},
                        {id: 'step3'}
                    ]
                }
            };

            const result = rc._buildFlowsIndex([flow1, flow2]);
            expect(result).to.deep.equal({
                flow1: {
                    step1: {id: 'step1'},
                    step2: {id: 'step2'}
                },
                flow2: {
                    step1: {id: 'step1'},
                    step2: {id: 'step2'},
                    step3: {id: 'step3'}
                }
            });
        });
    });

    describe('#_buildMQIndex', () => {
        it('should return queues index', () => {
            const queues = [
                {
                    name: 'flow1:step1'
                },
                {
                    name: 'flow1:step2'
                }
            ];
            const exchanges = [
                {
                    name: 'flow1'
                }
            ];
            const bindings = [
                {
                    destination: 'flow1:step2'
                }
            ];
            const result = rc._buildMQIndex(queues, exchanges, bindings);

            expect(result).to.deep.equal({
                flow1: {
                    queues: ['flow1:step1', 'flow1:step2'],
                    exchanges: ['flow1'],
                    bindings
                }
            });
        });
    });
});
