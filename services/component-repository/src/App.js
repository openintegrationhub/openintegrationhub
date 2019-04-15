const { App } = require('backend-commons-lib');

class ComponentRepositoryApp extends App {
    async _run() {
        const { asValue, asClass, asFunction } = this.awilix;
        const container = this.getContainer();
        const config = container.resolve('config');

        container.register({

        });
    }

    static get NAME() {
        return 'component-repository';
    }
}

module.exports = ComponentRepositoryApp;
