const defaultLogger = require('./logger');

class Scheduler {
    constructor(config, flowsDao, schedulePublisher) {
        this._logger = defaultLogger;
        this._config = config;
        this._flowsDao = flowsDao;
        this._schedulePublisher = schedulePublisher;
    }

    async _scheduleFlows() {
        const flows = await this._flowsDao.findForScheduling({
            limit: parseInt(this._config.get('POLLING_TASK_COUNT'))
        });
        this.getLogger().info(`Found ${flows.length} flows ready for scheduling`);
        await Promise.all(flows.map(flow => this._scheduleFlow(flow)));
    }

    async _scheduleFlow(flow) {
        try {
            await this._schedulePublisher.scheduleFlow(flow);
        } catch (err) {
            this.getLogger().error({ err, flow }, 'Failed to scheduler flow');
        }
        try {
            await this._flowsDao.planNextRun(flow);
        } catch (e) {
            this.getLogger().error({ err, flow }, 'Failed to plan next flow run');
        }
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
