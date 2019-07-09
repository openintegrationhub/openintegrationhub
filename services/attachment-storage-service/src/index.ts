import logger from './logger';
import { Config } from './config';
import RedisService  from './storage-drivers/redis/redis';
import RedisStorage from './storage-drivers/redis/redis-storage';
import Server from '@openintegrationhub/attachment-storage-service';
import Auth from './auth';

export default class Maester {
    private readonly config: Config;
    private readonly redis: RedisService;
    private server: Server;

    public constructor(config: Config) {
        const { REDIS, PORT } = config;

        logger.debug({ REDIS, PORT }, 'Config');

        this.config = config;
        this.redis = new RedisService(REDIS);
        this.redis
            .on('error', err => logger.error('Redis connection error', { err }))
            .on('close', () => logger.info('Redis connection closed'))
            .on('reconnecting', time => logger.info('Going to reconnect redis', { time }));

        const storageDriver = new RedisStorage(this.redis);
        const auth = new Auth();

        this.server = new Server({
            config,
            logger,
            storageDriver,
            auth
        });
    }

    public get serverCallback(): Function {
        return this.server.serverCallback;
    }

    public async connect() {
        logger.info('About to initialize redis');
        await this.redis.connect();
        logger.info('Redis initialized');
    }

    public async disconnect(waitForResponses: boolean = true) {
        logger.info('About to disconnect redis');
        if (waitForResponses) {
            await this.redis.quit();
        } else {
            await this.redis.disconnect();
        }
        logger.info('Redis disconnected');
    }

    public listen(port: number) {
        logger.info('Going to start server');
        this.server.listen(port);
        logger.info({port}, 'Server listening');
    }

    public async start(): Promise<void> {
        const { PORT } = this.config;
        await this.connect();
        this.listen(PORT);
    }

    public async stop(): Promise<void> {
        this.server.close();
        await this.disconnect();
    }
}

