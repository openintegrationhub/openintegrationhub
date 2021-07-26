const { Event, EventBus, EventBusManager } = require('@openintegrationhub/event-bus');
const CONSTANTS = require('../constant');
const SecretsDAO = require('../dao/secret');

class EventManager {

    constructor() {

        this.setupListeners();

    }

    async setupListeners() {

        const eventBus = EventBusManager.getEventBus();

        eventBus.subscribe('iam.user.deleted', async (event) => {
            await SecretsDAO.deleteAll({ ownerId: event.payload.user, type: CONSTANTS.ENTITY_TYPE.USER });
            await event.ack();
        });

        eventBus.subscribe('iam.tenant.deleted', async (event) => {
            await SecretsDAO.deleteAll({ ownerId: event.payload.tenant, type: CONSTANTS.ENTITY_TYPE.TENANT });
            await event.ack();
        });

        await eventBus.connect();

    }
}

module.exports = EventManager;
