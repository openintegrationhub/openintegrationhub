const { SchedulePublisher } = require('@openintegrationhub/scheduler');
const { Event } = require('@openintegrationhub/event-bus')

class OIH_SchedulePublisher extends SchedulePublisher {
    constructor({ logger, queueCreator, channel, eventBus }) {
        super();
        this._logger = logger;
        this._queueCreator = queueCreator;
        this._channel = channel;
        this._eventBus = eventBus
    }
    async scheduleFlow(flow) {
        const event = new Event({
            headers: {
                name: 'flow.execute'
            },
            payload: {
                flow
            }
        });
        this._eventBus.publish(event)
    }
}

module.exports = OIH_SchedulePublisher;
