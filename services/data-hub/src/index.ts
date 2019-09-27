import Server from './server';
import Logger from 'bunyan';
import { App } from 'backend-commons-lib';
import mongoose from 'mongoose';
import { EventBus, IEvent } from '@openintegrationhub/event-bus';
import DataObject from './models/data-object';

interface IDataRecordEventPayloadMeta {
    domainId: string;
    schemaUri: string;
    recordUid: string;
    applicationUid: string;
}

interface IDataRecordEventPayload {
    meta: IDataRecordEventPayloadMeta;
    data: object;
}

interface IDataRecordEvent extends IEvent {
    payload: IDataRecordEventPayload;
}

interface IDataRecordEventPayloadMeta {
    oihUid: string;
    applicationUid: string;
    recordUid: string;
}

interface IDataRecordEventPayload {
    meta: IDataRecordEventPayloadMeta;
}

interface IDataRecordRefEvent extends IEvent {
    payload: IDataRecordEventPayload;
}

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
            rabbitmqUri: config.get('RABBITMQ_URI')
        });

        const NEW_RECORD_EVENT_NAME = 'validation.success';
        eventBus.subscribe(NEW_RECORD_EVENT_NAME, async (evt: IDataRecordEvent) => {
            logger.trace({event: evt.toJSON()}, `Received ${NEW_RECORD_EVENT_NAME} event`);
            const { data, meta } = evt.payload;
            const { domainId, schemaUri, recordUid, applicationUid } = meta;
            try {
                await DataObject.create({
                    domainId,
                    schemaUri,
                    content: data,
                    refs: [
                        {
                            recordUid,
                            applicationUid
                        }
                    ]
                });
            } catch (e) {
                logger.error({err: e, event: evt.toJSON()}, 'Failed to save data record');
                await evt.nack();
                return;
            }

            await evt.ack();
        });

        const NEW_REF_EVENT_NAME = 'ref.create';
        eventBus.subscribe(NEW_REF_EVENT_NAME, async (evt: IDataRecordRefEvent) => {
            logger.trace({event: evt.toJSON()}, `Received ${NEW_REF_EVENT_NAME} event`);
            const { meta } = evt.payload;
            const { oihUid, applicationUid, recordUid } = meta;
            const dataRecord = await DataObject.findById(oihUid);

            if (dataRecord) {
                dataRecord.refs.push({
                    applicationUid,
                    recordUid
                });
                await dataRecord.save();
            } else {
                logger.warn(meta, 'Data record is not found');
            }

            await evt.ack();
        });

        await eventBus.connect();

        const server = new Server({config, logger});
        server.listen(config.get('PORT'));
    }

    public static NAME(): string {
        return 'data-hub';
    }
}
