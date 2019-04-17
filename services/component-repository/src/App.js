const { App } = require('backend-commons-lib');
const { Server } = require('@openintegrationhub/component-repository');

class ComponentRepositoryApp extends App {
    async _run() {
        const { asClass} = this.awilix;
        const container = this.getContainer();

        container.register({
            server: asClass(Server)
                .singleton()
                .inject(() => ({iam: undefined})) //use default iam middleware
        });

        const server = container.resolve('server');
        await server.start();
    }

    static get NAME() {
        return 'component-repository';
    }
}

module.exports = ComponentRepositoryApp;
