const {
    Event, EventBus, EventBusManager, events,
} = require('@openintegrationhub/event-bus');
const Logger = require('@basaas/node-logger');
const WorkflowDAO = require('../dao/workflows');
const WorkflowController = require('./workflowController');

const conf = require('../conf');
const { STATUS } = require('../constant');

const logger = Logger.getLogger(`${conf.logging.namespace}/events`);

const FLOW_EVENTS = {
    FLOW_STARTING: 'flow.starting',
    FLOW_STOPPING: 'flow.stopping',
    FLOW_STARTED: 'flow.started',
    FLOW_STOPPED: 'flow.stopped',
    FLOW_FAILED: 'flow.failed',
};

class EventManager {
    constructor() {
        this.setupListeners();
    }

    async setupListeners() {
        this.eventBus = EventBusManager.getEventBus();

        this.eventBus.subscribe(events['iam.tenant.deleted'], async (event) => {
            try {
                await WorkflowDAO.deleteAll({ tenant: event.payload.tenant });
                await event.ack();
            } catch (err) {
                logger.error('failed to delete apps on iam.tenant.deleted for event', event);
                logger.error(err);
            }
        });

        this.eventBus.subscribe(FLOW_EVENTS.FLOW_STOPPED, async (event) => {
            try {
                await WorkflowController.setFlowState({ flowId: event.payload.id, status: STATUS.FINISHED });
                await WorkflowController.next({ flowId: event.payload.id });
                await event.ack();
            } catch (err) {
                logger.error('failed to delete apps on iam.tenant.deleted for event', event);
                logger.error(err);
            }
        });

        this.eventBus.subscribe(FLOW_EVENTS.FLOW_STARTED, async (event) => {
            try {
                await WorkflowController.setFlowState({ flowId: event.payload.id, status: STATUS.STARTED });
                await event.ack();
            } catch (err) {
                logger.error('failed to delete apps on iam.tenant.deleted for event', event);
                logger.error(err);
            }
        });

        await this.eventBus.connect();
    }
}

module.exports = EventManager;
