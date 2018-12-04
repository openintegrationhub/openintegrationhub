const { Flow } = require('backendCommonsLib');
const { FlowsDao } = require('@openintegrationhub/scheduler');

const TICK_INTERVAL_MINUTES = 3;

class OIH_FlowsDao extends FlowsDao {
    constructor(config, logger, crdClient) {
        super();
        this._config = config;
        this._logger = logger;
        this._crdClient = crdClient;
    }

    //@todo: split into smaller methods
    async findForScheduling() {
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

        return flowsToSchedule;
    }

    async planNextRun(flow) {
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

module.exports = OIH_FlowsDao;
