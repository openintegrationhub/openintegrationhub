import StorageDriver, { DeleteCondition } from '../../storage-driver';
import { RouterContext } from 'koa-router';
import NotFound from '../../errors/api/NotFound';

interface DeletePayload {
    conditions?: DeleteCondition[];
}

export default class BatchStorageObjectController {
    private readonly objectsStorage: StorageDriver;
    public constructor(objectsStorage: StorageDriver) {
        this.objectsStorage = objectsStorage;
    }

    public async deleteMany(ctx: RouterContext): Promise<void> {
        const { conditions = [] }: DeletePayload = ctx.request.body;
        ctx.body = {
            id: await this.objectsStorage.deleteMany(conditions),
            status: 'started'
        };
        ctx.status = 202;
    }

    public async getDeletionStatus(ctx: RouterContext): Promise<void> {
        const { id } = ctx.params;
        const status = await this.objectsStorage.getDeletionStatus(id);
        if (status === null) {
            throw new NotFound();
        }
        ctx.body = {
            id,
            status
        };
    }
}
