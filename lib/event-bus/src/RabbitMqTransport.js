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
    constructor({rabbitmqUri, logger}) {
        super();
        this._rabbitmqUri = rabbitmqUri;
        this._exchangeAsserted = false;
        this._logger = logger;
        this._reconnect = false;
        this._subscriptions = [];
    }

    reset() {
      this._connection = false;
      this._exchangeAsserted = false;
      this._publishChannel = false;
      this._subscribeChannel = false;
    }

    async retry(){
      try {
        this._logger.debug('Retry Connection:');
        await this.connect();

        if(this._connection !== false && this._subscriptions.length > 0){
          const length = this._subscriptions.length;
          let i;
          for(i=0; i<length; i+=1){
            this._logger.debug('Retry Subscriptions');
            await this.handleSubscription({topics:this._subscriptions[i].topics, serviceName: this._subscriptions[i].serviceName}, this._subscriptions[i].callback);
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

        if (this._connection.connection.stream._hadError) {
          this._logger.error('Can\'t connect RabbitMQ-Server not running?');
          this._logger.error(this._connection.connection.stream);
          this.reset();
          if(this._reconnect) {
            setTimeout(this.retry.bind(this), 1000); // restart
          }
          return false;
        }

        this._connection.on('close', () => {
          if(this._reconnect) {
            this._logger.error('Connection closed. Starting reconnecting');
            this.reset();
            setTimeout(this.retry.bind(this), 1000); // restart
          }
          return false;
        });

        this._connection.on('error', (error) => {
          if (error.message !== 'Connection closing') {
            this._logger.error('Connection error', error.message);
          }
        });
      } catch (err) {
        this._logger.error(err);

        if(this._reconnect) {
          this._logger.error('An error occured. Starting reconnecting');
          this.reset();
          setTimeout(this.retry.bind(this), 1000); // restart
        }
        return false;
      }
    }

    async disconnect() {
        this._reconnect = false;
        return this._connection.close();
    }

    async _getPublishChannel() {
        try {
          if (!this._publishChannel) {
              this._publishChannel = await this._connection.createChannel();

              if (this._publishChannel.connection.stream._hadError) {
                this._logger.error('Channel error');
                this._logger.error(this._publishChannel.connection.stream);
              }
          }
          return this._publishChannel;
        } catch (err) {
          this._logger.error(err);
        }
    }

    async _getSubscribeChannel() {
      try {
        if(!this._connection || typeof this._connection.createChannel === 'undefined') {
          this._logger.error('Can`t create a channel without a connection');
          return false;
        }
        if (!this._subscribeChannel) {
            this._subscribeChannel = await this._connection.createChannel();
        }
        return this._subscribeChannel;
      } catch (err) {
        this._logger.error(err);
      }
    }

    async _assertExchange(channel) {
      try {
        if (this._exchangeAsserted) {
            return;
        }
        if(!channel || typeof channel.assertExchange === 'undefined') {
          this._logger.error('Can`t create an exchange without a channel');
          return false;
        }
        await channel.assertExchange(MAIN_EXCHANGE_NAME, 'topic');
        this._exchangeAsserted = true;
      } catch (err) {
        this._logger.error(err);
      }
    }

    async publish(event) {
      try {
        const buffer = Buffer.from(JSON.stringify(event.toJSON()));
        const routingKey = event.getHeader('name');
        const channel = await this._getPublishChannel();
        await this._assertExchange(channel);

        if(!channel || typeof channel.publish === 'undefined') {
          this._logger.error('Can`t publish without a working channel');
          return false;
        }

        return channel.publish(MAIN_EXCHANGE_NAME, routingKey, buffer);
      } catch (err) {
        this._logger.error(err);
        return false;
      }
    }

    async subscribe({topics, serviceName}, callback) {
        this._subscriptions.push({topics, serviceName, callback});
        this.handleSubscription({topics, serviceName}, callback);
    }

    async handleSubscription({topics, serviceName}, callback) {
        const channel = await this._getSubscribeChannel();
        const queueName = serviceName;

        if(!channel || typeof channel.assertQueue === 'undefined') {
            this._logger.error('Can`t subscribe without a channel');
            return false;
        }

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
