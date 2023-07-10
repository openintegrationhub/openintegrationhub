import {QueueCreator, AMQPLib, ConfigStore, Logger} from 'backend-commons-lib';
import Snapshot from './models/snapshot';

export interface ISnapshotsConsumerOptions {
    connection: AMQPLib.Connection;
    config: ConfigStore;
    logger: Logger;
}

export default class SnapshotsConsumer {
    private static SNAPSHOTS_QUEUE = 'flow-snapshots';
    private connection: AMQPLib.Connection;
    private config: ConfigStore;
    private logger: Logger;

    public constructor({connection, config, logger}: ISnapshotsConsumerOptions) {
        this.connection = connection;
        this.config = config;
        this.logger = logger;
    }

    public async consume(): Promise<void> {
        const logger = this.logger;
        const queueName = SnapshotsConsumer.SNAPSHOTS_QUEUE;
        const channel = await this.connection.createChannel();

        channel.on('error', function(err) {
            logger.fatal(err, 'RabbitMQ channel error');
            process.exit(1);
        });

        channel.on('close', function() {
            logger.fatal('RabbitMQ channel closed');
            process.exit(1);
        });

        const queueCreator = new QueueCreator(channel);
        await channel.prefetch(parseInt(this.config.get('PREFETCH_COUNT')));
        await queueCreator.assertExchange(QueueCreator.COLLECTOR_EXCHANGE);
        await queueCreator.assertQueue(queueName, {});
        await queueCreator.bindQueue(
            queueName,
            QueueCreator.COLLECTOR_EXCHANGE,
            '#.snapshot'
        );

        await channel.consume(queueName, msg => {
            // @ts-ignore
            this.onMessage(msg)
                // @ts-ignore
                .then(() => channel.ack(msg))
                .catch(err => {
                    this.logger.warn({err, msg}, 'Failed to process the message');
                    // @ts-ignore
                    channel.nack(msg, false, true);
                });
        });
    }

    private async onMessage(msg: AMQPLib.Message): Promise<void> {
        const snapshot = JSON.parse(msg.content.toString());
        const { taskId: flowId, stepId, flowExecId, tenant } = msg.properties.headers;
        this.logger.trace({flowId, stepId, flowExecId, snapshot}, 'Received snapshot');

        await Snapshot.findOneAndUpdate({
            flowId,
            stepId,
            flowExecId,
            tenant
        }, {
            snapshot
        }, {
            upsert: true
        });
    }
}

