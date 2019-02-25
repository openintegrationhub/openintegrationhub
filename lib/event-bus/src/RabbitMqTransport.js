const Transport = require('./Transport');
const amqplib = require('amqplib');
const Event = require('./Event');
const MAIN_EXCHANGE_NAME = 'event-bus';

class RabbitMqEvent extends Event {
    setChannel(channel) {
        this._channel = channel;
    }

    setMsg(msg) {
        this._msg = msg;
    }

    ack() {
        return this._channel.ack(this._msg);
    }

    nack() {
        return this._channel.nack(this._msg);
    }
}


class RabbitMqTransport extends Transport {
    constructor({rabbitmqUri}) {
        super();
        this._rabbitmqUri = rabbitmqUri;
        this._exchangeAsserted = false;
    }

    async connect() {
        this._connection = await amqplib.connect(this._rabbitmqUri);
    }

    async disconnect() {
        return this._connection.close();
    }

    async _getPublishChannel() {
        if (!this._publishChannel) {
            this._publishChannel = await this._connection.createChannel();
        }
        return this._publishChannel;
    }

    async _getSubscribeChannel() {
        if (!this._subscribeChannel) {
            this._subscribeChannel = await this._connection.createChannel();
        }
        return this._subscribeChannel;
    }

    async _assertExchange(channel) {
        if (this._exchangeAsserted) {
            return;
        }
        await channel.assertExchange(MAIN_EXCHANGE_NAME, 'topic');
        this._exchangeAsserted = true;
    }

    async publish(event) {
        const buffer = Buffer.from(JSON.stringify(event.toJSON()));
        const routingKey = event.getHeader('name');
        const channel = await this._getPublishChannel();
        await this._assertExchange(channel);
        return channel.publish(MAIN_EXCHANGE_NAME, routingKey, buffer);
    }

    async subscribe({topics, serviceName}, callback) {
        const channel = await this._getSubscribeChannel();
        const queueName = serviceName;

        await channel.assertQueue(queueName);
        await this._assertExchange(channel);
        for (let topic of topics) {
            await channel.bindQueue(queueName, MAIN_EXCHANGE_NAME, topic);
        }

        return channel.consume(queueName, async msg => {
            const json = JSON.parse(msg.content.toString());
            const event = new RabbitMqEvent(json);
            event.setChannel(channel);
            event.setMsg(msg);

            try {
                await callback(event);
            } catch (e) {
                console.error(e); //eslint-disable-line
            }
        });
    }
}

module.exports = RabbitMqTransport;
