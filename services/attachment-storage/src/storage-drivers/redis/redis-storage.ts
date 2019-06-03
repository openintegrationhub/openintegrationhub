import RedisService from './redis';
import RedisStorageObject from './redis-object';
import Healthcheckable from '../../server/healthcheckable';
import logger from "../../logger";
import StorageDriver, { StorageObjectMetadata } from '../../server/storage-driver';

export class StorageObjectExistsError extends Error {
    public constructor() {
        super('Object already exists');
    }
}

export default class StorageObjectsService implements StorageDriver, Healthcheckable {
    private readonly redis: RedisService;

    public constructor(redis: RedisService) {
        this.redis = redis;
    }

    public async find(id: string): Promise<RedisStorageObject> {
        const { redis } = this;
        const key = RedisStorageObject.key(id);
        if (!await redis.exists(key)) {
            return null;
        }
        const metadata = await redis.hgetall(RedisStorageObject.metadataKey(key));
        return new RedisStorageObject(redis, id, metadata);
    }

    public async create(id: string, metadata: StorageObjectMetadata): Promise<RedisStorageObject> {
        const { redis } = this;

        const key = RedisStorageObject.key(id);
        const res = await redis.setnx(key, id);
        const exists = !Boolean(res);

        if (exists) {
            throw new StorageObjectExistsError();
        }

        const meta = {
            ...metadata,
            maxChunkSize: RedisService.VAL_BYTES_LIMIT,
            chunkNum: 0,
            contentLength: 0,
            complete: false
        };

        const storageObject = new RedisStorageObject(redis, id, meta);
        await storageObject.saveMetadata();
        return storageObject;
    }

    public async deleteAllStorageObjects(): Promise<void> {
        const { redis } = this;
        const { keyPrefix } = redis.options;
        // transparent prefixing is not applied to KEYS and SCAN https://www.npmjs.com/package/ioredis#transparent-key-prefixing
        const keys = await redis.keys(`${redis.options.keyPrefix}${RedisStorageObject.KEY_PREFIX}:*`);

        if (!keys.length) {
            return;
        }

        let storageObjectKeys: string[] = keys;
        if (keyPrefix) {
            storageObjectKeys = keys.map(k => k.replace(keyPrefix, ''));
        }
        await redis.unlink(...storageObjectKeys);
    }

    public async healthcheck(): Promise<void> {
        const PING_TIMEOUT = 250;
        const start = Date.now();
        await this.redis.ping();
        const time = Date.now() - start;
        if (time > PING_TIMEOUT) {
            logger.warn('Redis ping took too long', { time });
            throw new Error('Redis ping took too long');
        }
    }
}
