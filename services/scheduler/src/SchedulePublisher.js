const uuid = require('uuid/v1');
const { SchedulePublisher } = require('@openintegrationhub/scheduler');

class OIH_SchedulePublisher extends SchedulePublisher {
    constructor({ logger, queueCreator, channel }) {
        super();
        this._logger = logger;
        this._queueCreator = queueCreator;
        this._channel = channel;
    }

    async scheduleFlow(flow) { //eslint-disable-line no-unused-vars
        this._logger.trace({ flowId: flow.id }, 'schedule flow tick');

        const scheduleRecord = {
            'taskId': flow.id,
            'execId': uuid().replace(/-/g, ''),
            'userId': 'DOES NOT MATTER'
        };

        //@todo: introduce common Message class
        const msg = {
            id: uuid(),
            attachments: {},
            body: {},
            headers: {},
            metadata: {}
        };

        const {
            messagesQueue,
            exchangeName,
            deadLetterRoutingKey
        } = this._queueCreator.getAmqpStepConfig(flow, flow.getFirstNode().id);

        await this._queueCreator.assertMessagesQueue(messagesQueue, exchangeName, deadLetterRoutingKey);

        await this._channel.sendToQueue(
            this._queueCreator.getAmqpStepConfig(flow, flow.getFirstNode().id).messagesQueue,
            Buffer.from(JSON.stringify(msg)),
            {
                headers: scheduleRecord
            }
        );
    }
}

module.exports = OIH_SchedulePublisher;
