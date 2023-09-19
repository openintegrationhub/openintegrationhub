const { SchedulePublisher } = require('@openintegrationhub/scheduler');
const { Event } = require('@openintegrationhub/event-bus');
const cronParser = require('cron-parser');

class OIH_SchedulePublisher extends SchedulePublisher {
  constructor({ eventBus }) {
    super();
    this._eventBus = eventBus;
  }
  async scheduleFlow(flow) {
    const interval = cronParser.parseExpression(flow.cron);
    const nextSheduledTimestamp = interval.next();
    const event = new Event({
      headers: {
        name: 'flow.execute',
        type: 'scheduler',
      },
      payload: {
        flow,
        msg: {
          data: {
            sheduledTimestamp: new Date().toISOString(),
            nextSheduledTimestamp,
          },
          metadata: {
            source: {
              name: 'scheduler',
              type: 'scheduler',
              externalExecId: generateRequestId(),
            },
          },
        },
      },
    });
    this._eventBus.publish(event);
  }
}

function generateRequestId() {
  // NOTE the result should be in the same format as provided by proxy in from of this server (nginx)
  const numbers = [];
  for (let i = 0; i < 32; i++) {
      numbers[i] = Math.floor(Math.random() * 16).toString(16);
  }
  return numbers.join('');
}

module.exports = OIH_SchedulePublisher;
