const assert = require('assert');
const defaultLogger = require('./logger');
const FlowsDao = require('./flows-dao');
const SchedulePublisher = require('./schedule-publisher');

class Scheduler {
    constructor(config, flowsDao, schedulePublisher) {
        assert(flowsDao instanceof FlowsDao, 'flowsDao argument should be an instance of FlowsDao');
        assert(schedulePublisher instanceof SchedulePublisher, 'schedulePublisher argument should be an instance of SchedulePublisher');

        this._logger = defaultLogger;
        this._config = config;
        this._flowsDao = flowsDao;
        this._schedulePublisher = schedulePublisher;
    }

    async _scheduleFlows() {
        const flows = await this._flowsDao.findForScheduling();
        this.getLogger().info(`Found ${flows.length} flows ready for scheduling`);
        await Promise.all(flows.map(flow => {
            try {
                this._scheduleFlow(flow)
            } catch (err) {
                this.getLogger().error({ err, flow }, 'Failed to scheduler flow');
            }
        }));
    }

    async _scheduleFlow(flow) {
        await this._schedulePublisher.scheduleFlow(flow);
        await this._flowsDao.planNextRun(flow);
    }

    async run() {
        const pollingInterval = this._config.get('POLLING_INTERVAL');
        this.getLogger().info('Starting flows scheduling loop');
        this.getLogger().info(`Flows will be scheduled every ${pollingInterval} millis`);

        /*eslint no-constant-condition:0*/
        while (true) {
            try {
                await this._scheduleFlows();
            } catch (e) {
                this.getLogger().error(e);
            }
            await new Promise(resolve => setTimeout(() => resolve(), pollingInterval));
        }
    }

    setLogger(logger) {
        this._logger = logger;
    }

    getLogger() {
        return this._logger;
    }
}

module.exports = Scheduler;
