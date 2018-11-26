const logger = require('./logger');

class Scheduler {
    constructor(config, flowsDao, schedulePublisher) {
        this._config = config;
        this._flowsDao = flowsDao;
        this._schedulePublisher = schedulePublisher;
    }

    async _scheduleFlows() {
        const flows = await this._flowsDao.findForScheduling({
            limit: parseInt(this._config.get('POLLING_TASK_COUNT'))
        });
        logger.info(`Found ${flows.length} flows ready for scheduling`);
        await Promise.all(flows.map(flow => this._scheduleFlow(flow)));
    }

    async _scheduleFlow(flow) {
        await this._schedulePublisher.scheduleFlow(flow);
        await this._flowsDao.planNextRun(flow);
    }

    async run() {
        const pollingInterval = this._config.get('POLLING_INTERVAL');
        logger.info('Starting flows scheduling loop');
        logger.info(`Flows will be scheduled every ${pollingInterval} millis`);

        /*eslint no-constant-condition:0*/
        while (true) {
            try {
                await this._scheduleFlows();
            } catch (e) {
                logger.error(e);
            }
            await new Promise(resolve => setTimeout(() => resolve(), pollingInterval));
        }
    }
}

module.exports = Scheduler;
