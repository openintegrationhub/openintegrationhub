const { Scheduler, FlowsDao, SchedulePublisher } = require('../../src/index');
const { expect, assert } = require('chai');
const sinon = require('sinon');

describe('Scheduler', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    function getFakeConfig(config) {
        return {
            get(key) {
                return config[key];
            }
        };
    }

    describe('should check arguments type', () => {
        it('should throw when not instance of FlowsDao', () => {
            try {
                new Scheduler({
                    confg: getFakeConfig({}),
                    flowsDao: {},
                    schedulePublisher: {}
                });
            } catch (e) {
                expect(e.message).to.equal('flowsDao argument should be an instance of FlowsDao');
            }
        });

        it('should throw when not instance of SchedulePublisher', () => {
            try {
                new Scheduler({
                    config: getFakeConfig({}),
                    flowsDao: new FlowsDao(),
                    schedulePublisher: {}
                });
            } catch (e) {
                expect(e.message).to.equal('schedulePublisher argument should be an instance of SchedulePublisher');
            }
        });
    });

    describe('#_scheduleFlows', () => {
        it('should schedule flows', async () => {
            const flowsDao = new FlowsDao();
            const schedulePublisher = new SchedulePublisher();
            const config = getFakeConfig({});
            const flow1 = {};
            const flow2 = {};
            sandbox.stub(flowsDao, 'findForScheduling').resolves([flow1, flow2]);
            const scheduler = new Scheduler({config, flowsDao, schedulePublisher});
            sandbox.stub(scheduler, '_scheduleFlow').resolves();

            await scheduler._scheduleFlows();
            assert.ok(flowsDao.findForScheduling.calledOnce);
            assert.ok(scheduler._scheduleFlow.calledTwice);
            assert.ok(scheduler._scheduleFlow.calledWith(flow1));
            assert.ok(scheduler._scheduleFlow.calledWith(flow2));
        });

        it('should not fail if _scheduleFlow fails', async () => {
            const flowsDao = new FlowsDao();
            const schedulePublisher = new SchedulePublisher();
            const config = getFakeConfig({});
            const flow1 = {};
            const flow2 = {};
            sandbox.stub(flowsDao, 'findForScheduling').resolves([flow1, flow2]);
            const scheduler = new Scheduler({config, flowsDao, schedulePublisher});
            sandbox.stub(scheduler, '_scheduleFlow').throws(new Error('Oh, hai'));

            await scheduler._scheduleFlows();
            assert.ok(flowsDao.findForScheduling.calledOnce);
            assert.ok(scheduler._scheduleFlow.calledTwice);
            assert.ok(scheduler._scheduleFlow.calledWith(flow1));
            assert.ok(scheduler._scheduleFlow.calledWith(flow2));
        });
    });

    describe('#_scheduleFlow', () => {
        it('should schedule flow', async () => {
            const flowsDao = new FlowsDao();
            const schedulePublisher = new SchedulePublisher();
            const config = getFakeConfig({});
            const flow1 = {};
            sandbox.stub(flowsDao, 'planNextRun').resolves();
            sandbox.stub(schedulePublisher, 'scheduleFlow').resolves();
            const scheduler = new Scheduler({config, flowsDao, schedulePublisher});

            await scheduler._scheduleFlow(flow1);
            assert.ok(flowsDao.planNextRun.calledOnce);
            assert.ok(schedulePublisher.scheduleFlow.calledOnce);
        });
    });

    describe('#run', () => {
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        it('should schedule flows regularly', async () => {
            const config = getFakeConfig({
                POLLING_INTERVAL: 100
            });
            const flowsDao = new FlowsDao();
            const schedulePublisher = new SchedulePublisher();
            const scheduler = new Scheduler({config, flowsDao, schedulePublisher});
            sandbox.stub(scheduler, '_scheduleFlows').resolves();

            scheduler.run();

            clock.tick(100);
            assert.equal(scheduler._scheduleFlows.callCount, 1);
        });
    });
});
