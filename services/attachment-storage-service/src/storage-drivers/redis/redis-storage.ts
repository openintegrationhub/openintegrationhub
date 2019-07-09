import RedisService from './redis';
import RedisStorageObject from './redis-object';
import {
    Healthcheckable,
    StorageDriver,
    StorageObjectMetadata,
    StorageObjectExistsError,
    DeleteCondition,
    DeletionStatus
} from '@openintegrationhub/attachment-storage-service';
import logger from '../../logger';
import { isMatch } from 'lodash';
import uuid from 'uuid/v4';

export default class StorageObjectsService implements StorageDriver, Healthcheckable {
    private static OBJECT_DELETION_PREFIX: string = 'object_deletions';

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

        const expiresAt = Date.now() + 5 * 24 * 60 * 60 * 1000;
        await redis.pexpireat(key, expiresAt);

        const meta = {
            ...metadata,
            expiresAt,
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
        const keys = await redis.keys(`${keyPrefix}${RedisStorageObject.KEY_PREFIX}:*`);

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

    public async deleteMany(conditions: DeleteCondition[] = []): Promise<string> {
        const conditionsObject = conditions.reduce((result: {[key: string]: string}, {key, value}) => {
            result[key] = value;
            return result;
        }, {});
        const { redis } = this;
        const { keyPrefix } = redis.options;

        const processId = uuid();
        await this.createObjectDeletion(processId, conditions);

        const stream = redis.scanStream({
            match: `${keyPrefix}${RedisStorageObject.KEY_PREFIX}:*:metadata`,
            count: 10
        });

        stream
            .on('data', async keys => {
                try {
                    stream.pause();

                    for (const key of keys) {
                        const id = this.getObjectIdByKey(key);
                        const object = await this.find(id);
                        if (isMatch(object.getMetadata(), conditionsObject)) {
                            logger.debug({id}, 'Deleting object');
                            await object.remove();
                        }
                    }

                    stream.resume();
                } catch (e) {
                    logger.error(e);
                }
            })
            .on('error', async err => {
                try {
                    logger.error(err, 'Error while processing Redis keys');
                    await this.updateObjectDeletionStatus(processId, 'error');
                } catch (e) {
                    logger.error(e);
                }
            })
            .on('end', async () => {
                try {
                    logger.info('Finished deleting objects');
                    await this.updateObjectDeletionStatus(processId, 'success');
                } catch (e) {
                    logger.error(e);
                }
            });

        return processId;
    }

    public async getDeletionStatus(id: string): Promise<DeletionStatus | null> {
        const { redis } = this;
        const res = await redis.hgetall(this.getObjectDeletionKey(id));
        if (res && res.status) {
            return res.status;
        }
        return null;
    }

    private async createObjectDeletion(id: string, conditions: DeleteCondition[]): Promise<void> {
        await this.redis.hmset(this.getObjectDeletionKey(id), {
            status: 'started',
            conditions: JSON.stringify(conditions)
        });
    }

    private async updateObjectDeletionStatus(id: string, status: 'success' | 'error'): Promise<void> {
        await this.redis.hset(this.getObjectDeletionKey(id), 'status', status);
    }

    private getObjectDeletionKey(id: string): string {
        return `${StorageObjectsService.OBJECT_DELETION_PREFIX}:${id}`;
    }

    private getObjectIdByKey(key: string): string {
        const parts = key.split(':');
        return parts[parts.length - 2];
    }
}
