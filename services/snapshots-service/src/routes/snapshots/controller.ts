import { RouterContext } from 'koa-router';
import Snapshot from '../../models/snapshot';

export default class DataController {
    public async getAll(ctx: RouterContext): Promise<void> {
        const { flowId } = ctx.params;
        const { flowExecId } = ctx.query;
        const doc = await Snapshot.find({flowId, flowExecId});
        ctx.body = {
            data: doc
        };
    }
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

    public async deleteMany(ctx: RouterContext): Promise<void> {
        const { flowId } = ctx.params;
        const { flowExecId } = ctx.query;
        await Snapshot.deleteMany({flowId, flowExecId});
        ctx.status = 204;
        ctx.body = null;
    }
}
