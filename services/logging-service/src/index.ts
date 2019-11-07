import Server from './server';
import { App, ConfigStore, Logger } from 'backend-commons-lib';

export default class ServiceApp extends App {
    public static NAME(): string {
        return 'logging-service';
    };

    protected async _run(): Promise<void> {
        const container = this.getContainer();
        const config: ConfigStore = container.resolve('config');
        const logger: Logger = container.resolve('logger');
        const server = new Server({config, logger});
        server.listen(config.get('PORT'));
    }
}
