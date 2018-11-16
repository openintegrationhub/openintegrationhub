//FIXME @see https://github.com/elasticio/commons/issues/811
process.env.ENVIRONMENT = 'integration_test';
const amqp = require('amqplib');
const commons = require('@elastic.io/commons');
const { rabbitmqMsgCipher, amqp: amqpHelpers } = commons;

class FakeFlow {
    constructor(amqpUri, task) {
        this._amqpUri = amqpUri;
        this._task = task;
        this._queueName = amqpHelpers.getMessagesQueue(this._task, this._task.getFirstNode().id);
        this._exchangeName = amqpHelpers.getTaskExchange(this._task);
    }
    async start() {
        this._conn = await amqp.connect(this._amqpUri);
        this._channel = await this._conn.createChannel();
        await this._channel.assertQueue(this._queueName, {
            exclusive: true,
            durable: false,
            autoDelete: true
        });
        await this._channel.assertExchange(this._exchangeName, 'topic', {
            durable: true,
            autoDelete: false
        });
        await this._channel.bindQueue(
            this._queueName,
            this._exchangeName,
            amqpHelpers.getInputRoutingKey(this._task, this._task.getFirstNode().id)
        );
        this._consumerTag = this._channel.consume(this._queueName, (msg) => {
            if (msg === null) {
                //just skip, it's channel close message
                return;
            }
            this._handleMessage(msg);
        });
        this._consumerTag = this._consumerTag.consumerTag;
    }
    async stop() {
        if (this._conn) {
            await this._channel.deleteExchange(this._exchangeName);
            if (this._consumerTag) {
                await this._channel.cancel(this._consumerTag);
            }
            await this._channel.deleteQueue(this._queueName);
            await this._conn.close();
            this._conn = null;
            this._channel = null;
        }
    }
    async _handleMessage(msg) {
        this._channel.ack(msg);
        const cipher = rabbitmqMsgCipher.getCurrentCipher();
        const content = JSON.parse(cipher.decrypt(msg.content.toString()));
        const replyTo = msg.properties.headers.reply_to;
        const marker = content.query.uuid;
        let timeout = Number(content.query.timeout);
        if (Number.isNaN(timeout)) {
            timeout = 10000;
        }
        if (timeout !== 0) {
            await new Promise((res) => setTimeout(res, timeout));
        }
        const body = Buffer.from(cipher.encrypt(JSON.stringify({
            body: {
                elasticio: {
                    'step_1': {
                        query: {
                            'uuid': marker
                        }
                    }
                }
            }
        })));
        await this._channel.publish(this._exchangeName, replyTo, body);
    }
}
module.exports = FakeFlow;
