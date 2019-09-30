import { RouterContext } from 'koa-router';
import DataObject, { IDataObjectDocument, IOwnerDocument } from '../../models/data-object';
import NotFound from '../../errors/api/NotFound';
import Unauthorized from '../../errors/api/Unauthorized';

interface IGteQuery {
    $gte: string;
}

interface IGetManyCondition {
    'owners.id': string;
    createdAt?: IGteQuery;
    updatedAt?: IGteQuery;
}

export default class DataController {
    public async getMany(ctx: RouterContext): Promise<void> {
        const { paging, user } = ctx.state;
        const { created_since: createdSince, updated_since: updatedSince } = ctx.query;
        const condition: IGetManyCondition = {
            'owners.id': user.sub
        };

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
        const { user } = ctx.state;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        if (!dataObject.owners.find(o => o.id === user.sub)) {
            throw new Unauthorized();
        }

        ctx.status = 200;
        ctx.body = {
            data: dataObject
        };
    }

    public async putOne(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const { id } = ctx.params;
        const { user } = ctx.state;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        if (!dataObject.owners.find(o => o.id === user.sub)) {
            throw new Unauthorized();
        }

        Object.keys(dataObject.toJSON()).forEach(key => {
            if (key === '_id') {
                return;
            }
            dataObject[<keyof IDataObjectDocument>key] = undefined;
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
        const { user } = ctx.state;
        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        }

        if (!dataObject.owners.find(o => o.id === user.sub)) {
            throw new Unauthorized();
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
        const { user } = ctx.state;
        body.owners = body.owners || [];
        if (!body.owners.find((o: IOwnerDocument) => o.id === user.sub)) {
            body.owners.push({
                id: user.sub,
                type: 'user'
            });
        }
        const dataObject = await DataObject.create(body);

        ctx.status = 201;
        ctx.body = {
            data: dataObject
        };
    }
}
