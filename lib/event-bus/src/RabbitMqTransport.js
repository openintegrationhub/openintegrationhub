const Transport = require('./Transport');
const amqplib = require('amqplib');
const Event = require('./Event');
const MAIN_EXCHANGE_NAME = 'event-bus';
const assert = require('assert');

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
        return this._channel.nack(this._msg, false, false);
    }
}


class RabbitMqTransport extends Transport {
    constructor({rabbitmqUri, logger, onCloseCallback}) {
        super();
        assert(rabbitmqUri, 'rabbitmqUri parameter is required');
        assert(logger, 'logger parameter is required');
        this._rabbitmqUri = rabbitmqUri;
        this._exchangeAsserted = false;
        this._logger = logger;
        this._reconnect = false;
        this._subscriptions = [];
        if(onCloseCallback) this.onCloseCallback = onCloseCallback;
    }

    reset() {
        this._connection = false;
        this._exchangeAsserted = false;
        this._publishChannel = false;
        this._subscribeChannel = false;
    }

    async _retry() {
        try {
            this._logger.debug('Retry Connection:');
            await this.connect();

            if (this._connection !== false && this._subscriptions.length > 0) {
                for (const {topics, serviceName, callback} of this._subscriptions) {
                    this._logger.debug('Retry Subscriptions');
                    await this._handleSubscription({topics, serviceName}, callback);
                }
            }
        } catch (err) {
            this._logger.error(err);
        }
    }

    async connect() {
        this._reconnect = true;
        try {
            this._connection = await amqplib.connect(this._rabbitmqUri);

            // init publish channel
            await this._getPublishChannel()

            if (this._connection.connection.stream._hadError) {
                this._logger.error('Can\'t connect RabbitMQ-Server not running?');
                this.reset();
                if (this._reconnect) {
                    setTimeout(this._retry.bind(this), 1000); // restart
                }
                return false;
            }

            this._connection.on('close', () => {
                if (this._reconnect) {
                    this._logger.error('Connection closed. Starting reconnecting');
                    this.reset();
                    setTimeout(this._retry.bind(this), 1000); // restart
                }

                if(this.onCloseCallback) {
                  this.onCloseCallback();
                }
                return false;
            });

            this._connection.on('error', (error) => {
                if(this.onCloseCallback) {
                  this.onCloseCallback(error);
                }

                if (error.message !== 'Connection closing') {
                    this._logger.error('Connection error', error.message);
                }
            });
        } catch (err) {
            this._logger.error(err);

            if (this._reconnect) {
                this._logger.error('An error occurred. Starting reconnecting');
                this.reset();
                setTimeout(this._retry.bind(this), 1000); // restart
            }

            if(this.onCloseCallback) {
              this.onCloseCallback(err);
            }
            return false;
        }
    }

    async disconnect() {
        this._reconnect = false;
        const channels = []
        channels.push(this._getPublishChannel().then(channel => channel.close()));
        channels.push(this._getSubscribeChannel().then(channel => channel.close()));
        await Promise.all(channels);
        return this._connection.close();
    }

    async _getPublishChannel() {
        if (this._publishChannel) {
            return this._publishChannel;
        }

        try {
            assert(this._connection, 'Can`t create a channel without a connection');
            this._publishChannel = await this._connection.createChannel();
            return this._publishChannel;
        } catch (err) {
            this._logger.error(err);
            throw err;
        }
    }

    async _getSubscribeChannel() {
        try {
            assert(this._connection, 'Can`t create a channel without a connection');
            if (!this._subscribeChannel) {
                this._subscribeChannel = await this._connection.createChannel();
            }
            return this._subscribeChannel;
        } catch (err) {
            this._logger.error(err);
            throw err;
        }
    }

    async _assertExchange(channel) {
        if (this._exchangeAsserted) {
            return;
        }
        try {
            assert(channel, 'Channel parameter is required');
            await channel.assertExchange(MAIN_EXCHANGE_NAME, 'topic');
            this._exchangeAsserted = true;
        } catch (err) {
            this._logger.error(err);
            throw err;
        }
    }

    _getRoutingKeyForEvent(event) {
        return event.getHeader('name');
    }

    async publish(event) {
        try {
            const buffer = Buffer.from(JSON.stringify(event.toJSON()));
            const routingKey = this._getRoutingKeyForEvent(event);
            const channel = await this._getPublishChannel();
            assert(channel, 'Can`t publish without a channel');
            await this._assertExchange(channel);
            return channel.publish(MAIN_EXCHANGE_NAME, routingKey, buffer, {
                persistent: true,
            });
        } catch (err) {
            this._logger.error(err);
            throw err;
        }
    }

    async subscribe({topics, serviceName}, callback) {
        this._subscriptions.push({topics, serviceName, callback});
        this._handleSubscription({topics, serviceName}, callback);
    }

    async _handleSubscription({topics, serviceName}, callback) {
        const channel = await this._getSubscribeChannel();
        const queueName = serviceName;
        assert(channel, 'Can`t subscribe without a channel');

        await channel.assertQueue(queueName);
        await this._assertExchange(channel);

        for (let topic of topics) {
            await channel.bindQueue(queueName, MAIN_EXCHANGE_NAME, topic);
        }

        return channel.consume(queueName, async msg => {
            let json;

            // for special case when msg = null is coming on channel close
            if (!msg || !msg.content) {
                return;
            }

            try {
                json = JSON.parse(msg.content.toString());
            } catch (err) {
                this._logger.error({err, msg: msg.headers}, 'Failed to parse message content');
                await channel.ack(msg); //Don't want to get back invalid messages
                return;
            }
            const event = new RabbitMqEvent(json);
            event.setChannel(channel);
            event.setMsg(msg);

            try {
                await callback(event);
            } catch (e) {
                this._logger.error(e, 'Event handler failed');
                try {
                    await channel.nack(msg);
                } catch (e) {
                    this._logger.error(e, 'Failed to nack the message');
                }
            }
        });
    }
}

module.exports = RabbitMqTransport;
