import IORedis, { Redis, Pipeline, KeyType } from 'ioredis';
import { RedisOptions } from 'ioredis';

declare module 'ioredis' {
    interface Redis {
        getrangeBuffer(key: KeyType, start: number, end: number, callback: (err: Error, res: Buffer) => void): void;
        unlink(...keys: KeyType[]): Promise<number>;
        mgetBuffer(...keys: KeyType[]): Promise<[Buffer]>;
        readonly options: RedisOptions;
    }

    interface Pipeline {
        getrangeBuffer(key: KeyType, start: number, end: number): Pipeline;
    }
}

export default class RedisService extends IORedis {
    public static readonly VAL_BYTES_LIMIT = 536870912;

    public constructor(options: RedisOptions) {
        super({ ...options, lazyConnect: true });
    }
}
