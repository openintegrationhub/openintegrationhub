const Transport = require('./Transport');
const amqplib = require('amqplib');
const Event = require('./Event');
const MAIN_EXCHANGE_NAME = 'event-bus';
const assert = require('assert');

const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds))

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
    constructor({rabbitmqUri, logger, onCloseCallback, onErrorCallback, onReconnectCallback}) {
        super();
        assert(rabbitmqUri, 'rabbitmqUri parameter is required');
        assert(logger, 'logger parameter is required');
        this._rabbitmqUri = rabbitmqUri;
        this._exchangeAsserted = false;
        this._logger = logger;
        this._reconnect = false;
        this._subscriptions = [];

        if(onCloseCallback) this.onCloseCallback = onCloseCallback;
        if(onErrorCallback) this.onErrorCallback = onErrorCallback;
        if(onReconnectCallback) this.onReconnectCallback = onReconnectCallback;
    }

    reset() {
        this._connection = false;
        this._exchangeAsserted = false;
        this._publishChannel = false;
        this._subscribeChannel = false;
    }

    async _retry() {
        try {
            this._logger.debug('Retry Connection');
            await this.connect();

            if (this._connection !== false && this._subscriptions.length > 0) {
                for (const {topics, serviceName, callback} of this._subscriptions) {
                    this._logger.debug('Retry Subscriptions', serviceName, topics);
                    await this._handleSubscription({topics, serviceName}, callback);
                }
                // if(this.onReconnectCallback) {
                //     this.onReconnectCallback();
                // }
            }
        } catch (err) {
            this._logger.error(err);

        }
    }

    async connect() {
        if (this.isConnecting) {
            return
        }
        this.reset();
        this.isConnecting = true;
        this._reconnect = true;
        try {
            this._connection = await amqplib.connect(this._rabbitmqUri);
            console.log('#######################################')
            this.isConnecting = false

            // init publish channel
            await this._getPublishChannel()

            if (this._connection.connection.stream._hadError) {
                this._logger.error('Can\'t connect RabbitMQ-Server not running?');

                if (this._reconnect) {
                    await this._retry() // restart
                } else {
                    this.reset();
                }
                return false;
            }

            this._connection.on('close', async () => {
                if (this._reconnect) {
                    this._logger.error('Connection closed. Start reconnecting');
                    await this._retry(); // restart
                } else {
                    if(this.onCloseCallback) {
                        this.onCloseCallback();
                    }
                }

                return false;
            });

            this._connection.on('error', (err) => {
                if(this.onErrorCallback) {
                  this.onErrorCallback(err);
                }

                if (err.message !== 'Connection closing') {
                    this._logger.error('Connection error', err.message);
                }
            });
        } catch (err) {
            this.isConnecting = false
            this._logger.error(err);

            if (this._reconnect) {
                this._logger.error('An error occurred. Starting reconnecting');
                await sleep(1000)
                await this.connect(); // restart
            } else {
                if(this.onErrorCallback) {
                    this.onErrorCallback(err);
                }
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
            return channel.publish(MAIN_EXCHANGE_NAME, routingKey, buffer);
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
