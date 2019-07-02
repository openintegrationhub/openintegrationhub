import { Readable, Writable } from 'stream';
import logger from '../../logger';
import RedisService from './redis';
import * as Logger from 'bunyan';
import { createHash } from 'crypto';
import { StorageObject, StorageObjectMetadata } from '@openintegrationhub/attachment-storage-service';

export class RedisObjectMeta implements StorageObjectMetadata {
    public readonly contentType: string;
    public readonly contentLength: number;
    public readonly complete: boolean;
    public readonly createdAt: number;
    public readonly expiresAt: number;
    public readonly maxChunkSize: number;
    public readonly chunkNum: number;
    public readonly md5Hash?: string;

    public constructor(meta: RedisObjectMeta) {
        Object.assign(this, meta);
        this.contentType = String(meta.contentType);
        this.contentLength = Number(meta.contentLength);
        this.maxChunkSize = Number(meta.maxChunkSize);
        this.chunkNum = Number(meta.chunkNum);
        this.md5Hash = meta.md5Hash ? String(meta.md5Hash) : meta.md5Hash;
        this.complete = String(meta.complete) === 'true';
        this.createdAt = meta.createdAt ? Number(meta.createdAt) : Date.now();
        this.expiresAt = Number(meta.expiresAt);
    }
}

export default class RedisStorageObject implements StorageObject {
    public static readonly KEY_PREFIX = 'storage_objects';
    private static readonly logger: Logger = logger.child({ component: 'StorageObjectModel' });

    public static key(id: string) {
        return `${RedisStorageObject.KEY_PREFIX}:${id}`;
    }

    public static metadataKey(key: string) {
        return `${key}:metadata`;
    }

    private readonly chunkKey: string;
    private readonly metadataKey: string;
    private readonly log: Logger;

    private readonly redis: RedisService;

    private readonly key: string;
    public readonly id: string;

    private meta: RedisObjectMeta;

    public constructor(
        redis: RedisService,
        id: string,
        meta: RedisObjectMeta
    ) {
        this.meta = new RedisObjectMeta(meta);
        this.key = id;
        this.key = RedisStorageObject.key(id);
        this.redis = redis;
        this.chunkKey = `${this.key}:chunk`;
        this.metadataKey = RedisStorageObject.metadataKey(this.key);
        this.log = RedisStorageObject.logger.child({
            key: this.key,
            chunkKey: this.chunkKey
        });
    }

    public get contentLength(): number {
        return this.meta.contentLength;
    }

    public get contentType(): string {
        return this.meta.contentType;
    }

    public get md5(): string {
        return this.meta.md5Hash;
    }

    public get complete(): boolean {
        return this.meta.complete;
    }

    public getWriteStream(): Writable {
        const { redis, chunkKey, meta: { maxChunkSize, expiresAt } } = this;
        let currentChunkNum = 0;
        let length = 0;
        let currentRedisChunkLength = 0;
        const hash = createHash('md5');

        return new Writable({
            write: (incomingChunk, encoding, callback) => {
                const multi = redis.multi();

                if (currentRedisChunkLength + incomingChunk.length <= maxChunkSize) {
                    multi.append(`${chunkKey}:${currentChunkNum}`, incomingChunk);
                    multi.pexpireat(`${chunkKey}:${currentChunkNum}`, expiresAt);
                    multi.exec((err: Error) => {
                        if (err) {
                            callback(err);
                            return;
                        }
                        hash.update(incomingChunk);
                        callback();
                    });

                    length += incomingChunk.length;
                    currentRedisChunkLength += incomingChunk.length;
                    return;
                }


                const leftLengthInCurrentRedisChunk = maxChunkSize - currentRedisChunkLength;
                let leftIncomingChunk = incomingChunk;

                if (leftLengthInCurrentRedisChunk) {
                    multi.append(
                        `${chunkKey}:${currentChunkNum}`,
                        incomingChunk.slice(0, leftLengthInCurrentRedisChunk)
                    );
                    multi.pexpireat(`${chunkKey}:${currentChunkNum}`, expiresAt);
                    leftIncomingChunk = incomingChunk.slice(leftLengthInCurrentRedisChunk);
                }

                currentRedisChunkLength = 0;
                currentChunkNum += 1;
                const chunksCount = Math.ceil(incomingChunk.length / maxChunkSize);
                for (let i = 0; i < chunksCount; i++) {
                    const buf = leftIncomingChunk.slice(
                        maxChunkSize * i,
                        maxChunkSize * (i + 1)
                    );
                    currentChunkNum += i;
                    multi.append(`${chunkKey}:${currentChunkNum}`, buf);
                    multi.pexpireat(`${chunkKey}:${currentChunkNum}`, expiresAt);
                    currentRedisChunkLength += buf.length;
                }

                multi.exec((err: Error) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    hash.update(incomingChunk);
                    length += incomingChunk.length;
                    callback();
                });
            },
            destroy: (err, callback) => {
                if (!err) {
                    return callback(err);
                }
                this.log.error('Write error happened', { err });
                this.log.debug('About to delete keys');
                this.remove()
                    .then(() => callback(null))
                    .catch((err: Error) => {
                        this.log.error('Failed to delete incomplete object', { err });
                        callback(err);
                    });
            },
            final: (callback) => {
                this.meta = {
                    ...this.meta,
                    chunkNum: length > 0 ? currentChunkNum + 1 : 0,
                    contentLength: length,
                    md5Hash: hash.digest('hex'),
                    complete: true
                };
                this.log.debug('About to set object');
                this.saveMetadata()
                    .then(() => callback(null))
                    .catch((err: Error) => {
                        if (err) {
                            this.log.error('Error setting object meta', {
                                err,
                                length
                            });
                            return callback(err);
                        }
                        callback();
                    });
            },
            // TODO writev
        });
    }

    public getReadStream(): Readable {
        const { redis, meta: { chunkNum }, chunkKey } = this;
        let currentChunkNum = 0;
        let readInCurrentRedisChunkSize = 0;
        return new Readable({
            read(size) {
                if (currentChunkNum === chunkNum) {
                    this.push(null);
                    return;
                }
                const key = `${chunkKey}:${currentChunkNum}`;
                const start = readInCurrentRedisChunkSize;
                const end = readInCurrentRedisChunkSize + size - 1;
                redis.getrangeBuffer(key, start, end, (err: Error, chunk) => {
                    if (err) {
                        process.nextTick(() => this.emit('error', err));
                        return;
                    }
                    this.push(chunk);
                    readInCurrentRedisChunkSize += chunk.length;
                    if (chunk.length < size) {
                        readInCurrentRedisChunkSize = 0;
                        currentChunkNum += 1;
                    }
                });
            }
        });
    }

    public async saveMetadata(): Promise<void> {
        const { expiresAt } = this.meta;
        const multi = this.redis.multi();
        multi.hmset(this.metadataKey, {...this.meta });
        multi.pexpireat(this.metadataKey, expiresAt);
        await multi.exec();
    }

    public getMetadata(): RedisObjectMeta {
        return this.meta;
    }

    public async calculateMd5Hash(): Promise<string> {
        const { redis, meta: { chunkNum } } = this;
        const chunkKeys = new Array(Number(chunkNum)).fill(null).map((v, i) => `${this.chunkKey}:${i}`);
        const chunks = await redis.mgetBuffer(...chunkKeys);
        return chunks.reduce((hash, chunk) => hash.update(chunk), createHash('md5')).digest('hex');
    }

    public async remove(): Promise<void> {
        const { redis, key } = this;
        const { keyPrefix } = redis.options;
        // transparent prefixing is not applied to KEYS and SCAN https://www.npmjs.com/package/ioredis#transparent-key-prefixing
        const keys = await redis.keys(`${keyPrefix}${key}:*`);

        if (!keys.length) {
            return;
        }

        let storageObjectKeys: string[] = keys;
        if (keyPrefix) {
            storageObjectKeys = keys.map(k => k.replace(keyPrefix, ''));
        }
        storageObjectKeys.push(key);
        await redis.unlink(...storageObjectKeys);
    }
}
