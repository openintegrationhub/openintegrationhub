const {
    Event, EventBus, EventBusManager, events,
} = require('@openintegrationhub/event-bus');
const Logger = require('@basaas/node-logger');
const DomainsDAO = require('../dao/domain/index');
const SchemasDAO = require('../dao/schema/index');

const conf = require('../conf');

const logger = Logger.getLogger(`${conf.log.namespace}/events`);

class EventManager {
    constructor() {
        this.setupListeners();
    }

    async setupListeners() {
        const eventBus = EventBusManager.getEventBus();

        eventBus.subscribe(events['iam.tenant.deleted'], async (event) => {
            try {
                await DomainsDAO.deleteAll({ tenant: event.payload.tenant });
                await event.ack();
            } catch (err) {
                logger.error('failed to delete domains on iam.tenant.deleted for event', event);
                logger.error(err);
            }
        });

        await eventBus.connect();
    }
}

module.exports = EventManager;
