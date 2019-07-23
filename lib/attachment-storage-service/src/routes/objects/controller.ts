import { Context } from 'koa';
import validate from 'uuid-validate';
import StorageDriver, { StorageObject, StorageObjectExistsError } from '../../storage-driver';
import StorageObjectNotFound from './errors/StorageObjectNotFound';
import StorageObjectAlreadyExists from './errors/StorageObjectAlreadyExists';
import StorageObjectTypeNotSupported from './errors/StorageObjectTypeNotSupported';
import InvalidObjectId from './errors/InvalidObjectId';
import ApiError from '../../errors/api/ApiError';
import { IRouterContext } from 'koa-router';

export default class StorageObjectController {
    private static readonly ALLOWED_CONTENT_TYPES = [
        'application/octet-stream',
        'application/json',
        'application/xml',
        'text/xml',
        'text/plain',
        'text/csv',
        'text/tsv'
    ];

    private readonly objectsStorage: StorageDriver;

    public constructor(objectsStorage: StorageDriver) {
        this.objectsStorage = objectsStorage;
    }

    public async getOne(ctx: Context) {
        const { state: { object } } = ctx;
        const { contentLength, contentType, complete } = object.getMetadata();

        if (!complete) {
            ctx.log.error('Object is incomplete');
            throw new ApiError();
        }

        ctx.set('Content-Type', contentType);
        ctx.set('Content-Length', String(contentLength));

        if (contentLength === 0) {
            ctx.log.debug('Object is empty');
            ctx.status = 204;
            return;
        }

        ctx.log.debug('About to stream object body');
        ctx.body = object.getReadStream();
    }

    public async save(ctx: Context) {
        const { params: { id }, state: { metadata }, req } = ctx;

        if (!validate(id)) {
            throw new InvalidObjectId();
        }

        const contentType = ctx.request.get('content-type').toLowerCase();

        if (!contentType || !StorageObjectController.ALLOWED_CONTENT_TYPES.includes(contentType)) {
            throw new StorageObjectTypeNotSupported();
        }

        ctx.log.debug('About to get object');
        let storageObject: StorageObject;
        try {
            const meta = {
                ...metadata,
                contentType,
                contentLength: 0,
                complete: false
            };
            storageObject = await this.objectsStorage.create(id, meta);
        } catch (err) {
            if (err instanceof StorageObjectExistsError) {
                ctx.log.error('Object already exists', { err });
                throw new StorageObjectAlreadyExists();
            }

            ctx.log.error('Failed to get object', { err });
            throw err;
        }

        ctx.log.debug('Got object', { storageObject });

        const writable = storageObject.getWriteStream();

        ctx.log.debug('About to pipe stream');

        const writePromise = await new Promise((resolve, reject) => {
            writable.once('error', (err: Error) => {
                ctx.log.error('Object write error', { err });
                writable.destroy(err);
                reject(err);
            });
            req.once('error', (err: Error) => {
                ctx.log.error('Object read error', { err });
                writable.destroy(err);
                reject(err);
            });
            writable.once('finish', () => resolve());
            req.pipe(writable);
        });

        await writePromise;

        ctx.log.debug('Object created');
        ctx.status = 201;
        ctx.body = 'Successfully created an object';
    }

    public async deleteOne(ctx: IRouterContext, next: Function) {
        const { state: { object } } = ctx;
        await object.remove();
        ctx.status = 204;
    }

    public async loadObject(ctx: IRouterContext, next: Function) {
        const { id } = ctx.params;
        ctx.log.debug('About to get object');
        const object = await this.objectsStorage.find(id);

        if (!object) {
            ctx.log.debug('Object not found ');
            throw new StorageObjectNotFound();
        }

        ctx.log.debug('Found object', { object });
        ctx.state.object = object;

        return next();
    }
}
