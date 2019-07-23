import Server from './server';
import Logger from 'bunyan';
import { App } from 'backend-commons-lib';
import mongoose from 'mongoose';

export default class DataHubApp extends App {
    protected async _run(): Promise<void> {
        const container = this.getContainer();
        const config = container.resolve('config');
        const logger = <Logger>container.resolve('logger');
        await mongoose.connect(config.get('MONGODB_URI'), { useNewUrlParser: true });
        const server = new Server({config, logger});
        server.listen(config.get('PORT'));
    }

    public static NAME(): string {
        return 'data-hub';
    }
}
