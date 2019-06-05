import { Readable, Writable } from 'stream';

export interface StorageObjectMetadata {
    readonly contentType: string;
    readonly contentLength: number;
    readonly complete: boolean;
    readonly [propName: string]: any;
}

export interface StorageObject {
    getWriteStream(): Writable;
    getReadStream(): Readable;
    remove(): Promise<void>;
    getMetadata(): StorageObjectMetadata;
}

export default interface StorageDriver {
    find(id: string): Promise<StorageObject|null>;
    create(id: string, metadata: StorageObjectMetadata): Promise<StorageObject>;
}

export class StorageObjectExistsError extends Error {
    public constructor() {
        super('Object already exists');
    }
}
