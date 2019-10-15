const { Event, EventBus, EventBusManager, events } = require('@openintegrationhub/event-bus');
const Logger = require('@basaas/node-logger');
const AppsDAO = require('../dao/apps');

const conf = require('../conf');

const logger = Logger.getLogger(`${conf.logging.namespace}/events`);

class EventManager {

    constructor() {

        this.setupListeners();

    }

    async setupListeners() {

        const eventBus = EventBusManager.getEventBus();

        eventBus.subscribe(events['iam.tenant.deleted'], async (event) => {
            try {
                await AppsDAO.deleteAll({ tenant: event.payload.tenant });
                await event.ack();
            } catch (err) {
                logger.error('failed to delete apps on iam.tenant.deleted for event', event);
                logger.error(err);
            }

        });

        await eventBus.connect();

    }
}

module.exports = EventManager;
