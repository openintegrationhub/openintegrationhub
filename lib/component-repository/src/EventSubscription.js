const Component = require('./models/Component');

class EventSubscription {
    constructor({eventBus, logger}) {
        this._eventBus = eventBus;
        this._logger = logger;
    }

    async subscribe() {
        this._subscribeToUserDeleted();
        await this._eventBus.connect();
    }

    async _subscribeToUserDeleted() {
        await this._eventBus.subscribe('iam.user.deleted', async (event) => {
            try {
                const { payload } = event;
                const { id } = payload;
                const owner = {id, type: 'user'};
                const components = await Component.findByOwner(owner);
                if (!components.length) {
                    return;
                }

                for (const component of components) {
                    component.removeOwner(owner);
                    await component.save();
                }
                await event.ack();
            } catch (err) {
                this._logger.error({ err, event }, 'Unable to process event');
                await event.nack();
            }
        });
    }
}

module.exports = EventSubscription;
