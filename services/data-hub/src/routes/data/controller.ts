import { RouterContext } from 'koa-router';
import mongoose from 'mongoose';
import DataObject, { IDataObjectDocument, IOwnerDocument } from '../../models/data-object';
import NotFound from '../../errors/api/NotFound';
import Unauthorized from '../../errors/api/Unauthorized';
import BadRequest from '../../errors/api/BadRequest';

interface IGteQuery {
    $gte: string;
}

interface IGetManyCondition {
    'owners.id': string;
    domainId?: string;
    schemaUri?: string;
    createdAt?: IGteQuery;
    updatedAt?: IGteQuery;
}

export default class DataController {
    public async getMany(ctx: RouterContext): Promise<void> {
        const { paging, user } = ctx.state;
        const {
            created_since: createdSince,
            updated_since: updatedSince,
            domain_id: domainId,
            schema_uri: schemaUri
        } = ctx.query;

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

        if (domainId) {
            condition.domainId = domainId;
        }

        if (schemaUri) {
            condition.schemaUri = schemaUri
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

        // if (!dataObject.owners.find(o => o.id === user.sub) && !user.permissions.includes('all')) {
        //     throw new Unauthorized();
        // }

        ctx.status = 200;
        ctx.body = {
            data: dataObject
        };
    }

    public async getOneByRecordId(ctx: RouterContext): Promise<void> {
        const { id } = ctx.params;
        const { user } = ctx.state;

        const dataObject = await DataObject.findOne({'refs.recordUid': id}).lean();

        if (!dataObject) {
            throw new NotFound();
        }

        // if (!dataObject.owners.find((o: any) => o.id === user.sub) && !user.permissions.includes('all')) {
        //     throw new Unauthorized();
        // }

        // @ts-ignore: TS2339
        dataObject.id = dataObject._id;
        // @ts-ignore: TS2339
        delete dataObject._id;
        // @ts-ignore: TS2339
        delete dataObject.createdAt;
        // @ts-ignore: TS2339
        delete dataObject.updatedAt;
        // @ts-ignore: TS2339
        delete dataObject.__v;

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

        Object.keys(dataObject.toJSON()).forEach((key: keyof IDataObjectDocument) => {
            if (key === '_id') {
                return;
            }
            (dataObject[key] as any) = undefined;
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

    public async postMany(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const { user } = ctx.state;
        
        const createPromises = []

        if (!Array.isArray(body) || body.length === 0) {
            throw new BadRequest()
        }

        body.forEach(record => {
            const owners = record.owners || []

            if (!owners.find((o: IOwnerDocument) => o.id === user.sub)) {
                owners.push({
                    id: user.sub,
                    type: 'user'
                });
            }

            createPromises.push(DataObject.create({
                ...record,
                owners,
            }))

        })

        await Promise.all(createPromises)

        ctx.status = 201;
    }

    public async postByRecordId(ctx: RouterContext): Promise<void> {
        const { body } = ctx.request;
        const { user } = ctx.state;

        const query = body.oihUid ?
            {
                $or: [
                    { 'refs.recordUid': body.recordUid },
                    {_id: mongoose.Types.ObjectId(body.oihUid)}
                ]
            } :
            {'refs.recordUid': body.recordUid}

        let dataObject = await DataObject.findOne(query);

        let action;
        if (dataObject) {
            action = 'update';

            if (!dataObject.refs.find((ref => ref.recordUid === body.recordUid))) {
                dataObject.refs.push({
                    recordUid: body.recordUid,
                    applicationUid: body.applicationUid
                })
            }

            if (!dataObject.owners.find((o: IOwnerDocument) => o.id === user.sub)) {
                // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
                let newIOwner = {} as IOwnerDocument;
                newIOwner.id = user.sub;
                newIOwner.type = 'user';
                dataObject.owners.push(newIOwner);
            }

            await dataObject.save();
        } else {
            action = 'insert';

            const newObject = {
                refs: [
                    {
                        recordUid: body.recordUid,
                        applicationUid: body.applicationUid
                    }
                ],
                owners: [
                    {
                        id: user.sub,
                        type: 'user'
                    }
                ]
            }
            // @ts-ignore: No overload matches this call.
            dataObject = await DataObject.create(newObject);
        }

        ctx.status = 201;
        ctx.body = {
            data: dataObject,
            action,
        };

    }
}
