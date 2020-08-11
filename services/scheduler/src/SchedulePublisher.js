const { SchedulePublisher } = require('@openintegrationhub/scheduler');
const { Event } = require('@openintegrationhub/event-bus');

class OIH_SchedulePublisher extends SchedulePublisher {
  constructor({ eventBus }) {
    super();
    this._eventBus = eventBus;
  }
  async scheduleFlow(flow) {
    const event = new Event({
      headers: {
        name: 'flow.execute',
        type: 'scheduler',
      },
      payload: {
        flow,
      },
    });
    this._eventBus.publish(event);
  }
}

module.exports = OIH_SchedulePublisher;
