import { Readable, Writable } from 'stream';

export interface StorageObjectMetadata {
    readonly contentType: string;
    readonly contentLength: number;
    readonly complete: boolean;
    readonly createdAt: number;
    readonly [propName: string]: any;
}

export interface StorageObject {
    getWriteStream(): Writable;
    getReadStream(): Readable;
    remove(): Promise<void>;
    getMetadata(): StorageObjectMetadata;
}

export interface DeleteCondition {
    key: string;
    value: string;
}

export type DeletionStatus = 'started' | 'success' | 'error';

export default interface StorageDriver {
    find(id: string): Promise<StorageObject|null>;
    create(id: string, metadata: StorageObjectMetadata): Promise<StorageObject>;
    deleteMany(conditions: DeleteCondition[]): Promise<string>;
    getDeletionStatus(id: string): Promise<DeletionStatus | null>;
}

export class StorageObjectExistsError extends Error {
    public constructor() {
        super('Object already exists');
    }
}
