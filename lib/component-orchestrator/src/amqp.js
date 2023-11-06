/* eslint consistent-return: 0 */ // --> OFF
/* eslint no-underscore-dangle: 0 */ // --> OFF
/* eslint no-use-before-define: 0 */ // --> OFF
/* eslint consistent-this: 0 */

const { IllegalOperationError } = require('amqplib/lib/error');
const { fromEvent, timeout } = require('promise-toolbox');

class Amqp {
    constructor(channel, settings, logger) {
        this.publishChannel = channel;
        this.settings = settings;
        this.log = logger;
    }

    async sendToExchange(exchangeName, routingKey, payload, options) {
        const buffer = Buffer.from(payload);

        return this.publishMessage(exchangeName, routingKey, buffer, options, 0);
    }

    async publishMessage(
        exchangeName,
        routingKey,
        payloadBuffer,
        options = { headers: {} },
        iteration
    ) {
        const { settings } = this;
        if (iteration) {
            options.headers.retry = iteration; // eslint-disable-line no-param-reassign
        }
        options.persistent = true; // eslint-disable-line no-param-reassign

        this.log.debug('Current memory usage: %s Mb', process.memoryUsage().heapUsed / 1048576);
        this.log.trace(
            'Pushing to exchange=%s, routingKey=%s, messageSize=%d, options=%j, iteration=%d',
            exchangeName,
            routingKey,
            payloadBuffer.length,
            options,
            iteration
        );
        try {
            const result = await this._promisifiedPublish(
                exchangeName,
                routingKey,
                payloadBuffer,
                options
            );
            if (!result) {
                this.log.warn(
                    'Buffer full when publishing a message to ' + 'exchange=%s with routingKey=%s',
                    exchangeName,
                    routingKey
                );
            }
            return result;
        } catch (error) {
            if (error instanceof IllegalOperationError) {
                this.log.error(
                    error,
                    `Failed on publishing ${options.headers.messageId} message to MQ`
                );
                // throw new Error(`Failed on publishing ${options.headers.messageId} message to MQ: ${error}`);
                this.log.error(
                    JSON.stringify({ exchangeName, routingKey, payloadBuffer, options, iteration })
                );
            }
            this.log.error(error, 'Failed on publishing message to queue');
            const delay = this._getDelay(
                settings.AMQP_PUBLISH_RETRY_DELAY,
                settings.AMQP_PUBLISH_MAX_RETRY_DELAY,
                iteration
            );
            await this._sleep(delay);
            iteration += 1; // eslint-disable-line no-param-reassign
            if (iteration < settings.AMQP_PUBLISH_RETRY_ATTEMPTS) {
                return this.publishMessage(
                    exchangeName,
                    routingKey,
                    payloadBuffer,
                    options,
                    iteration
                );
            }

            // throw new Error(`Failed on publishing ${options.headers.messageId} message to MQ: ${error}`);
            this.log.error(
                `Failed on publishing ${options.headers.messageId} message to MQ: ${error}`
            );
            this.log.error(
                JSON.stringify({ exchangeName, routingKey, payloadBuffer, options, iteration })
            );
        }
    }

    // eslint-disable-next-line class-methods-use-this
    _getDelay(defaultDelay, maxDelay, iteration) {
        this.log.debug({ defaultDelay }, 'Current delay');
        this.log.debug({ maxDelay }, 'Current delay');
        // eslint-disable-next-line no-restricted-properties
        const delay = Math.min(defaultDelay * Math.pow(2, iteration), maxDelay);
        this.log.debug({ delay }, 'Calculated delay');
        return delay;
    }

    // eslint-disable-next-line class-methods-use-this
    async _sleep(time) {
        await new Promise((resolve) => setTimeout(resolve, time));
    }

    async _promisifiedPublish(exchangeName, routingKey, payloadBuffer, options) {
        try {
            let result;
            const threshold = 10000;
            const { publishChannel } = this;
            const publishPromise = new Promise((resolve, reject) => {
                result = publishChannel.publish(
                    exchangeName,
                    routingKey,
                    payloadBuffer,
                    options,
                    (err, ok) => {
                        err ? reject(err) : resolve(ok); // eslint-disable-line no-unused-expressions
                    }
                );
            });

            await publishPromise;
            if (this.settings.PROCESS_AMQP_DRAIN && result === false) {
                this.log.debug('Amqp buffer is full: waiting for drain event..');
                let drained = true;
                await timeout.call(fromEvent(this.publishChannel, 'drain'), threshold, () => {
                    drained = false;
                    this.log.error(
                        `Drain event was not emitted after ${
                            threshold / 1000
                        } seconds, proceeding...`
                    );
                });
                if (drained) {
                    this.log.debug('Amqp buffer drained!');
                }
                result = true;
            }

            return result;
        } catch (error) {
            this.log.error(error);
            throw error;
        }
    }

    async sendComponentInputMessage(exchangeName, routingKey, data, headers) {
        const payload = JSON.stringify(data);
        const properties = {
            contentType: 'text/json',
            headers
        };
        return this.sendToExchange(exchangeName, routingKey, payload, properties);
    }
}
exports.Amqp = Amqp;
