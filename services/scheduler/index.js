const uuid = require('node-uuid');
const express = require('express');

const Lib = require('lib');
const { 
    QueueCreator,
    Flow,
    App,
    K8sService,
    AMQPService
} = Lib;

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
        const now = new Date();
        for (let flow of flows) {
            const flowModel = new Flow(flow);
            const firstStep = flowModel.getFirstNode();
            if (!firstStep || !firstStep.isPolling) {
                this._logger.trace({flowId: flowModel.id}, 'flow is not polling, skip');
                continue;
            }
            if (!flowModel.dueExecution || now >= new Date(flowModel.dueExecution)) { 
                try {
                    await this._scheduleOne(flowModel);

                    flowModel.dueExecution = new Date();
                    flowModel.dueExecution.setMinutes(flowModel.dueExecution.getMinutes(), 3);
                    this._logger.trace({flowId: flowModel.id, dueExecution: flowModel.dueExecution}, 'schedule next flow tick');
                    await this._crdClient.flow(flowModel.id).put(
                        {
                            body: flowModel.toCRD()
                        }
                    );
                 } catch (e) {
                     this._logger.error(e, 'failed to schedule flow run');
                 }
            } else {
                 this._logger.trace({flowId: flowModel.id, dueExecution: flowModel.dueExecution}, 'skip schedule');
            }
        }
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
        new Scheduler(this);
    }
    getK8s() {
        return this._k8s;
    }
    getAmqpChannel() {
        return this._channel; 
    }

    getQueueCreator() {
        return this._queueCreator 
    }

    _initHealthcheckApi(listenPort) {
        const app = express();
        app.get('/healthcheck', (req, res) => {
            res.status(200).end(); 
        });
        app.listen(listenPort);
    }

    static get NAME() {
        return 'flows-operator';
    }
}

(async () => {
    try {
        const app = new SchedulerApp();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1);
    }
})();
