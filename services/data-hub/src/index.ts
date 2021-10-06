import Server from './server';
import Logger from 'bunyan';
import { App } from 'backend-commons-lib';
import mongoose from 'mongoose';
import { EventBus, IEvent, Event } from '@openintegrationhub/event-bus';
import DataObject from './models/data-object';
import resolveConflict from './cfm/conflict-manager'

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
            const { data, meta } = evt.payload;
            const { domainId, schemaUri, recordUid, applicationUid } = meta;
            const log = logger.child({recordUid, applicationUid});
            log.trace({event: evt.toJSON()}, `Received ${NEW_RECORD_EVENT_NAME} event`);

            const oldRecord = await DataObject.findOne({
                refs: {
                    $elemMatch: {
                        recordUid,
                        applicationUid
                    }
                }
            });

            try {
                if (oldRecord) {
                    log.debug('Updating the existing record');
                    const newContent = resolveConflict(data, oldRecord.content)

                    // If CFM returns an empty object, incoming data is an exact duplicate and can be discarded
                    if (newContent  === {}) {
                        await evt.ack();
                        return
                    }

                    oldRecord.content = newContent;
                    await oldRecord.save();
                    const recordUpdatedEvent = new Event({
                        headers: {
                            name: 'data-hub.record.updated'
                        },
                        payload: {
                            meta: Object.assign({}, meta, {oihUid: oldRecord.id, refs: oldRecord.refs}),
                            data: newContent
                        }
                    });

                    await eventBus.publish(recordUpdatedEvent);
                } else {
                    log.debug('Creating a new record');
                    const newRecord = await DataObject.create({
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

                    const recordCreatedEvent = new Event({
                        headers: {
                            name: 'data-hub.record.created'
                        },
                        payload: {
                            meta: Object.assign({}, meta, {oihUid: newRecord.id}),
                            data
                        }
                    });

                    await eventBus.publish(recordCreatedEvent);
                }
            } catch (e) {
                logger.error({err: e, event: evt.toJSON()}, 'Failed to save data record');
                await evt.nack();
                return;
            }

            await evt.ack();
        });

        const NEW_REF_EVENT_NAME = 'ref.create';
        eventBus.subscribe(NEW_REF_EVENT_NAME, async (evt: IDataRecordRefEvent) => {
            const { meta } = evt.payload;
            const { oihUid, applicationUid, recordUid } = meta;
            const log = logger.child({oihUid, applicationUid, recordUid});
            log.trace({event: evt.toJSON()}, `Received ${NEW_REF_EVENT_NAME} event`);

            const dataRecord = await DataObject.findById(oihUid);
            if (dataRecord) {
                // @ts-ignore
                if (dataRecord.refs.find(
                    ref => ref.applicationUid === applicationUid.toString() && ref.recordUid === recordUid.toString()
                )) {
                    log.warn('The same ref already exists');
                } else {
                    log.debug('Creating a new ref');
                    // @ts-ignore
                    dataRecord.refs.push({
                        applicationUid,
                        recordUid
                    });
                    await dataRecord.save();
                }
            } else {
                log.warn('Data record is not found');
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
