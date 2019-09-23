import Server from './server';
import Logger from 'bunyan';
import { App } from 'backend-commons-lib';
import mongoose from 'mongoose';
import { EventBus, IEvent } from '@openintegrationhub/event-bus';
import DataObject from './models/data-object';

export default class DataHubApp extends App {
    protected async _run(): Promise<void> {
        const container = this.getContainer();
        const config = container.resolve('config');
        const logger = <Logger>container.resolve('logger');
        const mongooseOptions = {
            socketTimeoutMS: 60000,
            useCreateIndex: true,
            useNewUrlParser: true
        };
        await mongoose.connect(config.get('MONGODB_URI'), mongooseOptions);

        const eventBus = new EventBus({
            serviceName: 'data-hub',
            rabbitmqUri: config.get('RABBITMQ_URI'),
            transport: null
        });

        eventBus.subscribe('master-data-record.created', async (e: IEvent) => {
            console.log(e.headers);
            console.log(e.payload);

            // @todo: validate event's payload
            await DataObject.create(e.payload);

            await e.ack();
        });

        eventBus.subscribe('master-data-record.updated', async (e: IEvent) => {
            console.log(e.headers);
            console.log(e.payload);

            // @todo: validate event's payload
            const dataRecord = await DataObject.findById(e.payload.id);
            if (dataRecord) {
                Object.apply(dataRecord, e.payload);
            }
            await dataRecord.save();

            await e.ack();
        });

        await eventBus.connect();

        const server = new Server({config, logger});
        server.listen(config.get('PORT'));
    }

    public static NAME(): string {
        return 'data-hub';
    }
}
