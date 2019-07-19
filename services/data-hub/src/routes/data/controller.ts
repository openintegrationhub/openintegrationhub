import { RouterContext } from 'koa-router';
import DataObject, { DataObject as IDataObject } from '../../models/data-object';
import NotFound from '../../errors/api/NotFound';

interface GteQuery {
    $gte: string;
}

interface Condition {
    createdAt?: GteQuery;
    updatedAt?: GteQuery;
}

export default class DataController {
    public async getMany(ctx: RouterContext): Promise<void> {
        const { paging } = ctx.state;
        const { created_since: createdSince, updated_since: updatedSince } = ctx.query;
        const condition: Condition = {};

        if (createdSince) {
            condition.createdAt = {
                $gte: createdSince
            };
        }

        if (updatedSince) {
            condition.updatedAt = {
                $gte: updatedSince
            };
        }

        console.log(paging);

        const [data, total] = await Promise.all([
            await DataObject.find(condition).skip(paging.offset).limit(paging.perPage),
            await DataObject.countDocuments(condition),
        ]);

        const meta = {
            page: paging.page,
            perPage: paging.perPage,
            total: total,
            totalPages: Math.ceil(total / paging.perPage)
        };

        ctx.status = 200;
        ctx.body = {
            data,
            meta
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
