import { RouterContext } from 'koa-router';
import Snapshot from '../../models/snapshot';
import { isAdmin } from '@openintegrationhub/iam-utils'
import Forbidden from '../../errors/api/Forbidden';
import BadRequest from '../../errors/api/BadRequest';

export default class DataController {
    public async getAll(ctx: RouterContext): Promise<void> {
        const { flowId } = ctx.params;
        const { flowExecId } = ctx.query;
        const { query } = ctx.state;
        // @ts-ignore
        const doc = await Snapshot.find({
            ...query, 
            flowId,
            flowExecId
        });
        ctx.body = {
            data: doc
        };
    }
    public async getOne(ctx: RouterContext): Promise<void> {
        const { flowId, stepId } = ctx.params;
        const { query } = ctx.state;
        const doc = await Snapshot.findOne({
            ...query, 
            flowId,
            stepId
        });
        ctx.body = {
            data: doc ? doc.snapshot : {}
        };
    }

    public async deleteOne(ctx: RouterContext): Promise<void> {
        const { flowId, stepId } = ctx.params;
        const { query } = ctx.state;
        await Snapshot.findOneAndDelete({
            ...query, 
            flowId,
            stepId
        });
        ctx.status = 204;
        ctx.body = null;
    }

    public async deleteMany(ctx: RouterContext): Promise<void> {
        const { user } = ctx.state;
        const { flowExecId } = ctx.query;

        if (!isAdmin(user)) {
            throw new Forbidden();
        }

        if (!flowExecId) {
            throw new BadRequest();
        }
        await Snapshot.deleteMany({flowExecId});
        ctx.status = 204;
        ctx.body = null;
    }
}
