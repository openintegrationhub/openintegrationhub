import { RouterContext } from 'koa-router';
import Snapshot from '../../models/snapshot';
import { isAdmin } from '@openintegrationhub/iam-utils'
import Forbidden from '../../errors/api/Forbidden';
import BadRequest from '../../errors/api/BadRequest';

export default class DataController {
    public async getAll(ctx: RouterContext): Promise<void> {
        const { flowId } = ctx.params;
        const { flowExecId } = ctx.query;
        // @ts-ignore
        const doc = await Snapshot.find({flowId, flowExecId});
        ctx.body = {
            data: doc
        };
    }
    public async getOne(ctx: RouterContext): Promise<void> {
        const { flowId, stepId } = ctx.params;
        const doc = await Snapshot.findOne({flowId, stepId}).sort({updated_at: -1});
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
