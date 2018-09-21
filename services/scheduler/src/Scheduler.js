const uuid = require('node-uuid');

const Lib = require('lib');
const { Flow } = Lib;

async function loop (body, logger, loopInterval) {
    logger.info('loop TICK');
    try {
        await body();
    } catch (e) {
        logger.error(e, 'loop body error');
    }
    setTimeout(async () => {
        loop(body, logger, loopInterval);
    }, loopInterval);    
}

class Scheduler {
    constructor(app) {
        this._logger = app.getLogger().child({service: "Scheduler"});
        this._crdClient = app.getK8s().getCRDClient();
        this._channel = app.getAmqpChannel();
        this._queueCreator = app.getQueueCreator();
        this._config = app.getConfig();
        loop(this._loopBody.bind(this), this._logger, 5000);
    }
    async _scheduleOne(flow) {
        this._logger.trace({flowId: flow.id}, 'schedule flow tick');
         
        const scheduleRecord = {
            'taskId': flow.id,
            'execId': uuid().replace(/-/g, ''),
            'userId': "DOES NOT MATTER"
        };
        const msg = {
            id: uuid.v1(),
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
    async _loopBody() {
        const flows = (await this._crdClient.flows.get()).body.items;
        const schedulerRecords = (await this._crdClient.schedulerrecords.get()).body.items;
        const schedulerRecordsIndex = schedulerRecords.reduce((index, record) => {
            index[record.metadata.name] = record;
            return index; 
        }, {});
        const now = new Date();
        for (let flow of flows) {
            const flowModel = new Flow(flow);
            const firstStep = flowModel.getFirstNode();
            if (flowModel.metadata.deletionTimestamp) {
                this._logger.trace({flowId: flowModel.id}, 'flow is deleting now, skip');
                continue; 
            }
            if (!firstStep || !firstStep.isPolling) {
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
            const schedulerRecord = schedulerRecordsIndex[flowModel.id] || {
                "apiVersion": "elastic.io/v1",
                "kind": "SchedulerRecord",
                "metadata": {
                    "name": flowModel.id,
                    "namespace": this._config.get('NAMESPACE'),
                    ownerReferences: [
                        {
                            apiVersion: "elastic.io/v1",                                     
                            kind: "Flow",
                            controller: true,
                            name: flowModel.metadata.name,
                            uid: flowModel.metadata.uid
                        }
                    ]
                },
                "spec": {
                }
            };
            delete schedulerRecordsIndex[flowModel.id];
            if (!schedulerRecord.spec.dueExecution || now >= new Date(schedulerRecord.spec.dueExecution)) { 
                try {
                    await this._scheduleOne(flowModel);

                    const newDueExecution = new Date();
                    newDueExecution.setMinutes(newDueExecution.getMinutes() + 3);
                    this._logger.trace({flowId: flowModel.id, dueExecution: newDueExecution}, 'schedule next flow tick');
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
                        await this._crdClient.schedulerrecords(flowModel.id).put({body: schedulerRecord});
                    }
                 } catch (e) {
                     this._logger.error(e, 'failed to schedule flow run');
                 }
            } else {
                 this._logger.trace({flowId: flowModel.id, dueExecution: schedulerRecord.spec.dueExecution}, 'skip schedule');
            }
        }
        for (let flowId in schedulerRecordsIndex) {
            await this._crdClient.schedulerrecords(flowId).delete();
        }
    }
}
module.exports = Scheduler;
