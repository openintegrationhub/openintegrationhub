import { RouterContext } from 'koa-router';
import mongoose from 'mongoose';
import DataObject, { IDataObjectDocument, IOwnerDocument } from '../../models/data-object';
import NotFound from '../../errors/api/NotFound';
import Unauthorized from '../../errors/api/Unauthorized';
import scoreObject from '../../handlers/scorer';

interface IGteQuery {
    $gte: string;
}

interface IGetManyCondition {
    'owners.id': string;
    createdAt?: IGteQuery;
    updatedAt?: IGteQuery;
}

const definedFunctions = {
    'someFunction': function() {

    },
    score: scoreObject,
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

    public async applyFunctions(ctx: RouterContext): Promise<void> {
        const { paging, user } = ctx.state;
        const { body } = ctx.request;

        if(!body.functions || !Array.isArray(body.functions)) {
          ctx.status = 500;
          ctx.body = 'No functions configured';
        } else {
          ctx.status = 200;
          ctx.body = 'Preparing data';

          // Prepare DB query
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


          const handleDocument = (doc) => {
            let preparedDoc = doc;
            // Apply configured functions one after another
              for (let i = 0; i < body.functions.length; i++) {
                if(body.functions[i].name && body.functions[i].name in definedFunctions) {
                  preparedDoc = definedFunctions[body.functions[i].name](doc, body.functions[i].fields)
                } else {
                  console.log('Function not found:', body.functions[i].name);
                }
              }
            if(preparedDoc !== false) {
              // Update db
              DataObject.update({_id: doc._id}, preparedDoc);
            }
          }

          // Query DB
          const rows = await DataObject.find(condition)
            .skip(paging.offset)
            .limit(paging.perPage)
            .exec(handleDocument);


        }
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
