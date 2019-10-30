import { RouterContext } from 'koa-router';
import Snapshot from '../../models/snapshot';

export default class DataController {
    public async getOne(ctx: RouterContext): Promise<void> {
        const { flowId, stepId } = ctx.params;
        const doc = await Snapshot.findOne({flowId, stepId});
        ctx.body = {
            data: doc ? doc.snapshot : {}
        };
    }

    public async deleteOne(ctx: RouterContext): Promise<void> {
        const { flowId, stepId } = ctx.params;
        await Snapshot.findOneAndDelete({flowId, stepId});
        ctx.status = 204;
        ctx.body = null;
    }
}
