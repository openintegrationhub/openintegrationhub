import Server from './server';
import { App, AMQPService, ConfigStore, Logger } from 'backend-commons-lib';
import mongoose from 'mongoose';
import SnapshotsConsumer from './snapshots-consumer';

export default class SnapshotsServiceApp extends App {
    public static SNAPSHOTS_QUEUE = 'flow-snapshots';
    public static NAME(): string {
        return 'snapshots-service';
    };

    protected async _run(): Promise<void> {
        const container = this.getContainer();
        const config: ConfigStore = container.resolve('config');
        const logger: Logger = container.resolve('logger');
        const mongooseOptions = {
            socketTimeoutMS: 60000,
        };

        await mongoose.connect(config.get('MONGODB_URI'), mongooseOptions);
        const amqp: AMQPService = container.resolve('amqp');
        await amqp.start();

        const snapshotsConsumer = new SnapshotsConsumer({
            connection: amqp.getConnection(),
            config,
            logger
        });
        await snapshotsConsumer.consume();

        const server = new Server({config, logger});
        server.listen(config.get('PORT'));
    }
}
