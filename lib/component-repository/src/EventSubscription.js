const Component = require('./models/Component');

class EventSubscription {
    constructor({eventBus}) {
        this._eventBus = eventBus;
    }

    async subscribe() {
        this._subscribeToUserDeleted();
        await this._eventBus.connect();
    }

    async _subscribeToUserDeleted() {
        await this._eventBus.subscribe('iam.user.deleted', async (event) => {
            const { payload } = event;
            const { id } = payload;
            const components = await Component.findByOwner({id, type: 'user'});
            if (!components.length) {
                return;
            }

            for (const component of components) {
                component.removeOwner({id: id, type: 'user'});
                await component.save();
            }
        });
    }
}

module.exports = EventSubscription;
