const assert = require('assert');
const defaultLogger = require('./logger');
const FlowsDao = require('./flows-dao');
const SchedulePublisher = require('./schedule-publisher');

/**
 * Main class that orchestrates scheduling process.
 */
class Scheduler {
    /**
     * @param opts
     * @param {Config} opts.config
     * @param {FlowsDao} opts.flowsDao
     * @param {SchedulePublisher} opts.schedulePublisher
     */
    constructor({config, logger = defaultLogger, flowsDao, schedulePublisher}) {
        assert(flowsDao instanceof FlowsDao, 'flowsDao argument should be an instance of FlowsDao');
        assert(schedulePublisher instanceof SchedulePublisher, 'schedulePublisher argument should be an instance of SchedulePublisher');

        this._logger = logger;
        this._config = config;
        this._flowsDao = flowsDao;
        this._schedulePublisher = schedulePublisher;
    }

    /**
     * Gets a list of flows from the flowsDao object and schedules each of them.
     * @returns {Promise<void>}
     * @private
     */
    async _scheduleFlows() {
        const flows = await this._flowsDao.findForScheduling();
        this.getLogger().info(`Found ${flows.length} flows ready for scheduling`);
        await Promise.all(flows.map(async flow => {
            try {
                await this._scheduleFlow(flow);
            } catch (err) {
                this.getLogger().error({ err, flow }, 'Failed to scheduler flow');
            }
        }));
    }

    /**
     * Schedules individual flow.
     * @param {Flow} flow
     * @returns {Promise<void>}
     * @private
     */
    async _scheduleFlow(flow) {
        await this._schedulePublisher.scheduleFlow(flow);
        await this._flowsDao.planNextRun(flow);
    }

    /**
     * Runs the main scheduling loop.
     * @returns {Promise<void>}
     */
    async run() {
        const pollingInterval = this._config.get('POLLING_INTERVAL') || 5000;
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

    /**
     * Set logger.
     * @param {Logger} logger - Bunyan logger instance.
     */
    setLogger(logger) {
        this._logger = logger;
    }

    /**
     * Get logger.
     * @returns {Logger}
     */
    getLogger() {
        return this._logger;
    }
}

module.exports = Scheduler;
