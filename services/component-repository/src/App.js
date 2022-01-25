const { App } = require('backend-commons-lib');
const { Server } = require('@openintegrationhub/component-repository');
const { EventBus, Event } = require('@openintegrationhub/event-bus');

class ComponentRepositoryApp extends App {
    async _run() {
        const { asClass } = this.awilix;
        const container = this.getContainer();
        const config = container.resolve('config');

        container.register({
            eventBus: asClass(EventBus, {
                injector: () => ({
                    serviceName: this.constructor.NAME,
                    rabbitmqUri: config.get('CLOUDAMQP_URL'),
                    transport: undefined,
                    onCloseCallback: undefined,
                })
            }).singleton(),
            server: asClass(Server)
                .singleton()
                .inject(() => ({iam: undefined, eventClass: Event})) //use default iam middleware
        });
        console.log("container:",container)
        const server = container.resolve('server');
        await server.start();
    }

    static get NAME() {
        return 'component-repository';
    }
}

module.exports = ComponentRepositoryApp;
