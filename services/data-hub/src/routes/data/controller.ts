import { RouterContext } from 'koa-router';
import DataObject, { DataObject as IDataObject } from '../../models/data-object';
import NotFound from '../../errors/api/NotFound';

export default class DataController {
    public async getMany(ctx: RouterContext): Promise<void> {
        const dataObjects = await DataObject.find({});

        ctx.status = 200;
        ctx.body = {
            data: dataObjects,
            meta: {}
        };
    }

    public async getOne(ctx: RouterContext): Promise<void> {
        const { id } = ctx.params;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        ctx.status = 200;
        ctx.body = {
            data: dataObject
        };
    }

    public async putOne(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const { id } = ctx.params;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        Object.keys(dataObject.toJSON()).forEach(key => {
            if (key === '_id') {
                return;
            }
            dataObject[<keyof IDataObject>key] = undefined;
        });

        Object.assign(dataObject, body);
        await dataObject.save();

        ctx.status = 200;
        ctx.body = {
            data: dataObject
        };
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
        ctx.body = {
            data: dataObject
        };
    }

    public async postOne(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const dataObject = await DataObject.create(body);
        ctx.status = 201;
        ctx.body = {
            data: dataObject
        };
    }
}
