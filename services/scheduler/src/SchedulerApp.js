const express = require('express');
const uuid = require('uuid/v1');
const {
    Flow,
    QueueCreator,
    App,
    K8sService,
    AMQPService
} = require('backendCommonsLib');
const TICK_INTERVAL_MINUTES = 3;
const { Scheduler, FlowsDao, SchedulePublisher } = require('@openintegrationhub/scheduler');

class OIH_FlowsDao extends FlowsDao {
    constructor(config, logger, crdClient) {
        super();
        this._config = config;
        this._logger = logger;
        this._crdClient = crdClient;
    }

    async findForScheduling() { //eslint-disable-line no-unused-vars
        const flows = (await this._crdClient.flows.get()).body.items;
        this._logger.info(`Found ${flows.length} flows`);
        const schedulerRecords = (await this._crdClient.schedulerrecords.get()).body.items;
        this._logger.info(`Found ${schedulerRecords.length} scheduler records`);
        const schedulerRecordsIndex = schedulerRecords.reduce((index, record) => {
            index[record.metadata.name] = record;
            return index;
        }, {});
        this._schedulerRecordsIndex = schedulerRecordsIndex;

        const now = new Date();
        const flowsToSchedule = [];

        for (let flow of flows) {
            const flowModel = new Flow(flow);
            const firstNode = flowModel.getFirstNode();
            if (flowModel.metadata.deletionTimestamp) {
                this._logger.trace({flowId: flowModel.id}, 'flow is deleting now, skip');
                continue;
            }
            if (!firstNode || !firstNode.isPolling) {
                this._logger.trace({flowId: flowModel.id}, 'flow is not polling, skip');
                const schedulerRecord = schedulerRecordsIndex[flowModel.id];
                if (schedulerRecord) {
                    this._logger.trace({
                        name: schedulerRecord.metadata.name,
                        dueExecution: schedulerRecord.spec.dueExecution
                    }, 'Going to delete scheduler record due non-polling flow');
                    await this._crdClient.schedulerrecords(flowModel.id).delete();
                }
                continue;
            }

            let schedulerRecord = schedulerRecordsIndex[flowModel.id];
            if (!schedulerRecord) {
                schedulerRecord = schedulerRecordsIndex[flowModel.id] = {
                    'apiVersion': 'elastic.io/v1',
                    'kind': 'SchedulerRecord',
                    'metadata': {
                        'name': flowModel.id,
                        'namespace': this._config.get('NAMESPACE'),
                        ownerReferences: [
                            {
                                apiVersion: 'elastic.io/v1',
                                kind: 'Flow',
                                controller: true,
                                name: flowModel.metadata.name,
                                uid: flowModel.metadata.uid
                            }
                        ]
                    },
                    'spec': {}
                };
            }

            this._logger.info({
                flowId: flowModel.id,
                dueExecution: schedulerRecord.spec.dueExecution,
                now
            });
            if (!schedulerRecord.spec.dueExecution || now >= new Date(schedulerRecord.spec.dueExecution)) {
                flowsToSchedule.push(flowModel);
            } else {
                this._logger.trace({
                    flowId: flowModel.id,
                    dueExecution: schedulerRecord.spec.dueExecution
                }, 'skip schedule');
            }
        }

        // for (let flowId in schedulerRecordsIndex) {
        //     await this._crdClient.schedulerrecords(flowId).delete();
        // }

        return flowsToSchedule;
    }

    async planNextRun(flow) { //eslint-disable-line no-unused-vars
        const schedulerRecord = this._schedulerRecordsIndex[flow.id];
        const newDueExecution = new Date();
        newDueExecution.setMinutes(newDueExecution.getMinutes() + TICK_INTERVAL_MINUTES);
        this._logger.trace({flowId: flow.id, dueExecution: newDueExecution}, 'schedule next flow tick');
        schedulerRecord.spec.dueExecution = newDueExecution;
        if (!schedulerRecord.metadata.uid) {
            this._logger.trace({
                name: schedulerRecord.metadata.name,
                dueExecution: schedulerRecord.spec.dueExecution
            }, 'Create new scheduler record');
            await this._crdClient.schedulerrecords.post({body: schedulerRecord});
        } else {
            this._logger.trace({
                name: schedulerRecord.metadata.name,
                dueExecution: schedulerRecord.spec.dueExecution
            }, 'Update new scheduler record');
            await this._crdClient.schedulerrecords(flow.id).put({body: schedulerRecord});
        }
    }
}

class OIH_SchedulePublisher extends SchedulePublisher {
    constructor(logger, queueCreator, channel) {
        super();
        this._logger = logger;
        this._queueCreator = queueCreator;
        this._channel = channel;
    }

    async scheduleFlow(flow) { //eslint-disable-line no-unused-vars
        this._logger.trace({flowId: flow.id}, 'schedule flow tick');

        const scheduleRecord = {
            'taskId': flow.id,
            'execId': uuid().replace(/-/g, ''),
            'userId': 'DOES NOT MATTER'
        };

        //@todo: introduce common Message class
        const msg = {
            id: uuid(),
            attachments: {},
            body: {},
            headers: {},
            metadata: {}
        };

        const {
            messagesQueue,
            exchangeName,
            deadLetterRoutingKey
        } = this._queueCreator.getAmqpStepConfig(flow, flow.getFirstNode().id);

        await this._queueCreator.assertMessagesQueue(messagesQueue, exchangeName, deadLetterRoutingKey);

        await this._channel.sendToQueue(
            this._queueCreator.getAmqpStepConfig(flow, flow.getFirstNode().id).messagesQueue,
            Buffer.from(JSON.stringify(msg)),
            {
                headers:  scheduleRecord
            }
        );
    }
}


class SchedulerApp extends App {
    async _run() {
        this._amqp = new AMQPService(this);
        this._k8s = new K8sService(this);
        await this._amqp.start();
        await this._k8s.start();
        this._initHealthcheckApi(this.getConfig().get('LISTEN_PORT'));
        this._channel = await this._amqp.getConnection().createChannel();
        this._queueCreator = new QueueCreator(this._channel);

        const flowsDao = new OIH_FlowsDao(this.getConfig(), this.getLogger(), this.getK8s().getCRDClient());
        const schedulePublisher = new OIH_SchedulePublisher(this.getLogger(), this.getQueueCreator(), this.getAmqpChannel());
        const scheduler = new Scheduler(this.getConfig(), flowsDao, schedulePublisher);
        await scheduler.run();
    }

    getK8s() {
        return this._k8s;
    }

    getAmqpChannel() {
        return this._channel;
    }

    getQueueCreator() {
        return this._queueCreator;
    }

    _initHealthcheckApi(listenPort) {
        const app = express();
        app.get('/healthcheck', (req, res) => {
            res.status(200).end();
        });
        app.listen(listenPort);
    }

    static get NAME() {
        return 'scheduler';
    }
}

module.exports = SchedulerApp;
