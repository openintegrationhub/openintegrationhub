const amqp = require('amqp-connection-manager');

class AMQPServiceV2 {
    constructor ({ config, logger }) {
        this._config = config;
        this._logger = logger;
    }

    async start() {
        const logger = this._logger;
        const amqpUri = this._config.get('RABBITMQ_URI');
        this._connection = amqp.connect(amqpUri)
        return new Promise((resolve, reject) => {
            this._connection.on('connect', function() {
                resolve(this._connection)
            });
            this._connection.on('error', function(err) {
                logger.error(err)
                reject()
            });
        })

    }
    async stop() {
        throw new Error('implement me');
    }

    getConnection () {
        return this._connection;
    }

}
module.exports = AMQPServiceV2;
