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
        const queueName = SnapshotsConsumer.SNAPSHOTS_QUEUE;
        const ch = await this.connection.createChannel();
        const queueCreator = new QueueCreator(ch);
        await ch.prefetch(parseInt(this.config.get('PREFETCH_COUNT')));
        await queueCreator.assertExchange(QueueCreator.COLLECTOR_EXCHANGE);
        await queueCreator.assertQueue(queueName, {});
        await queueCreator.bindQueue(
            queueName,
            QueueCreator.COLLECTOR_EXCHANGE,
            '#.snapshot'
        );

        await ch.consume(queueName, msg => this.onMessage(msg, ch));
    }

    private onMessage(msg: AMQPLib.Message, ch: AMQPLib.Channel): void {
        const json = JSON.parse(msg.content.toString());
        this.logger.info({content: json, properties: msg.properties}, 'Received snapshot');
        ch.ack(msg);
    }
}

