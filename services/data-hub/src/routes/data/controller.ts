import { RouterContext } from 'koa-router';
import DataObject from '../../models/data-object';
import NotFound from '../../errors/api/NotFound';

export default class DataController {
    public async getOne(ctx: RouterContext): Promise<void> {
        const { id } = ctx.params;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        ctx.status = 200;
        ctx.body = dataObject;
    }

    public async putOne(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const { id } = ctx.params;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        Object.assign(dataObject, body);
        await dataObject.save();

        ctx.status = 200;
        ctx.body = dataObject;
    }

    public async patchOne(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const { id } = ctx.params;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        Object.assign(dataObject, body);
        await dataObject.save();

        ctx.status = 200;
        ctx.body = dataObject;
    }

    public async create(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const dataObject = await DataObject.create(body);
        ctx.status = 201;
        ctx.body = dataObject;
    }
}
