/**
 * Abstraction layer for sending flows for execution.
 */
class SchedulePublisher {
    /**
     * Send a command to execute a flow. Is triggered for each flow ready for the next execution cycle.
     * @param {Flow} flow
     * @returns {Promise<void>}
     */
    async scheduleFlow(flow) { //eslint-disable-line no-unused-vars
        throw new Error('To be implemented');
    }
}

module.exports = SchedulePublisher;
