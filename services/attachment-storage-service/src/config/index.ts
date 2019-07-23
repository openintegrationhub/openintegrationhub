import nconf, { Provider } from 'nconf';
import { resolve } from 'path';

import * as DEFAULTS from './default.json';
import { RedisOptions } from 'ioredis';

export class Config {
    protected nconf: Provider;

    public constructor() {
        const ENVIRONMENT = process.env.NODE_ENV;

        nconf.env({ parseValues: true });
        nconf.file(resolve(__dirname, `${ENVIRONMENT}.json`));
        nconf.defaults(DEFAULTS);
        nconf.required([
            'REDIS_CONFIG',
            'PORT'
        ]);

        this.nconf = nconf;
    }

    public get PORT(): number {
        return this.nconf.get('PORT');
    }

    public get LOG_LEVEL(): string {
        return this.nconf.get('LOG_LEVEL');
    }

    public get REDIS(): RedisOptions {
        const redisConfig = this.nconf.get('REDIS_CONFIG');
        return typeof redisConfig === 'string' ? JSON.parse(redisConfig) : redisConfig;
    }

    public get TERMINATION_DELAY(): number {
        return Number(this.get('TERMINATION_DELAY'));
    }

    public get(key: string): string {
        return this.nconf.get(key);
    }

}

export default new Config();
