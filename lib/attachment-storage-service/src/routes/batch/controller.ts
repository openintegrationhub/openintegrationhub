import StorageDriver, { DeleteCondition } from '../../storage-driver';
import { RouterContext } from 'koa-router';
import NotFound from '../../errors/api/NotFound';

interface DeletePayload {
    cond?: DeleteCondition[];
}

export default class BatchStorageObjectController {
    private readonly objectsStorage: StorageDriver;
    public constructor(objectsStorage: StorageDriver) {
        this.objectsStorage = objectsStorage;
    }

    public async deleteMany(ctx: RouterContext): Promise<void> {
        const { cond = [] }: DeletePayload = ctx.request.body;
        await this.objectsStorage.deleteMany(cond);
        ctx.status = 201;
    }

    public async getDeletionStatus(ctx: RouterContext): Promise<void> {
        const { id } = ctx.params;
        const deletionStatus = await this.objectsStorage.getDeletionStatus(id);
        if (!deletionStatus) {
            throw new NotFound();
        }
        ctx.body = deletionStatus;
    }
}
