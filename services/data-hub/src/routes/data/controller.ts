import { RouterContext } from 'koa-router';
import mongoose from 'mongoose';
import _ from 'lodash';
import { isAdmin, isTenantAdmin } from '@openintegrationhub/iam-utils'
import DataObject, { IDataObjectDocument, IOwnerDocument } from '../../models/data-object';
import NotFound from '../../errors/api/NotFound';
import Forbidden from '../../errors/api/Forbidden';
import BadRequest from '../../errors/api/BadRequest';
import handlers from '../../handlers/'

interface IGteQuery {
    $gte: string;
}

interface IGetManyCondition {
    'owners.id'?: string;
    domainId?: string;
    schemaUri?: string;
    createdAt?: IGteQuery;
    updatedAt?: IGteQuery;
    tenant?: string;
}

export default class DataController {

    public async getRecordCount(ctx: RouterContext): Promise<void> {
        const { user } = ctx.state;
        const {
            tenant: tenant
        } = ctx.query;

        const condition: IGetManyCondition = {};

        if (!isAdmin(user) && !isTenantAdmin(user)) {
            throw new Forbidden();
        }

        if (tenant) {
            if (user.tenant !== tenant) {
                if (!isAdmin(user)) {
                    throw new Forbidden();
                }
            }
        }

        if (tenant) {
            condition.tenant = tenant?.toString()
        } else if (isTenantAdmin(user)) {
            condition.tenant = user.tenant
        }

        const total = await DataObject.countDocuments(condition)

        ctx.status = 200;

        ctx.body = {
            data: {
                totalRecords: total
            }
        };
    }

    public async getMany(ctx: RouterContext): Promise<void> {
        const { paging, user } = ctx.state;
        const {
            created_since: createdSince,
            updated_since: updatedSince,
            domain_id: domainId,
            schema_uri: schemaUri,
            tenant: tenant,
            min_score: minScore,
            has_duplicates: hasDuplicates,
            has_subsets: hasSubsets,
            is_unique: isUnique
        } = ctx.query;

        const condition: IGetManyCondition = {};

        if (!isAdmin(user)) {
            condition["owners.id"] = user.sub
        }

        if (isAdmin(user)) {
            if (tenant) {
                condition.tenant = tenant?.toString()
            }
        }

        if (createdSince) {
            condition.createdAt = {
                $gte: createdSince?.toString()
            };
        }

        if (updatedSince) {
            condition.updatedAt = {
                $gte: updatedSince?.toString()
            };
        }

        if (domainId) {
            condition.domainId = domainId?.toString();
        }

        if (schemaUri) {
            condition.schemaUri = schemaUri?.toString()
        }

        if (minScore) {
            condition['enrichmentResults.score'] = { $gte: Number(minScore) }
        }

        if (hasDuplicates) {
            condition['enrichmentResults.knownDuplicates.0'] = { $exists: true }
        }

        if (hasSubsets) {
            condition['enrichmentResults.knownSubsets.0'] = { $exists: true }
        }

        if (isUnique) {
            condition['enrichmentResults.knownDuplicates.0'] = { $exists: false };
            condition['enrichmentResults.knownSubsets.0'] = { $exists: false };
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
                    $gte: createdSince?.toString()
                };
            }

            if (updatedSince) {
                condition.updatedAt = {
                    $gte: updatedSince?.toString()
                };
            }

            // Query DB
            const cursor = await DataObject.find(condition)
                .skip(paging.offset)
                .limit(paging.perPage)
                .lean()
                .cursor();

            for (let doc = await cursor.next(); doc !== null; doc = await cursor.next()) {
              // Apply configured functions one after another
              let preparedDoc = Object.assign({}, doc);
              for (let i = 0; i < body.functions.length; i++) {
                  if(body.functions[i].name && body.functions[i].name in handlers) {
                      preparedDoc = await handlers[body.functions[i].name](preparedDoc, body.functions[i].fields, condition);
                  } else {
                      console.log('Function not found:', body.functions[i].name);
                  }
              }
              if(preparedDoc) {
                // Update db;
                const result = await DataObject.findOneAndUpdate({_id: doc._id}, preparedDoc, {new: true, useFindAndModify:false});
          }
      }
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

        ctx.status = 200;
        ctx.body = {
            data: dataObject
        };
    }

    public async getOneByIdAndDeleteRecordId(ctx: RouterContext): Promise<void> {
        const { id, recordId } = ctx.params;
        const { user } = ctx.state;

        const dataObject = await DataObject.findById(id);

        if (!dataObject) {
            throw new NotFound();
        } else {
            // @ts-ignore: TS2532
            const index = (dataObject.refs)? dataObject.refs.indexOf(recordId) : -1;
            if (index > -1) {
              ctx.status = 200;
              // @ts-ignore: TS2532
              dataObject.refs.splice(index, 1);
              // @ts-ignore: TS2532
              if (dataObject.refs.length > 0) {
                await dataObject.save();
              } else {
                // Delete orphan entry if no more recordIds are left
                dataObject.remove();
              }
            } else {
              ctx.status = 404;
            }

        }

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

        // @ts-ignore: TS2532
        if (!dataObject.owners.find(o => o.id === user.sub)) {
            throw new Forbidden();
        }

        // @ts-ignore: TS2345
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

        // @ts-ignore: TS2532
        if (!dataObject.owners.find(o => o.id === user.sub)) {
            throw new Forbidden();
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

            // @ts-ignore: TS2345
            createPromises.push(DataObject.create({
                ...record,
                tenant: user.tenant,
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
            // @ts-ignore: TS2532
            if (!dataObject.refs.find((ref => ref.recordUid === body.recordUid))) {
                // @ts-ignore: TS2532
                dataObject.refs.push({
                    recordUid: body.recordUid,
                    applicationUid: body.applicationUid
                })
            }
            // @ts-ignore: TS2532
            if (!dataObject.owners.find((o: IOwnerDocument) => o.id === user.sub)) {
                const newIOwner = {} as IOwnerDocument;
                newIOwner.id = user.sub;
                newIOwner.type = 'user';
                // @ts-ignore: TS2532
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

    public async getStatistics(ctx: RouterContext): Promise<void> {
        const { user } = ctx.state;

        const scores = {};
        let allDuplicates = [];
        let allSubsets = [];

        // Find only objects with at least one relevant value
        const enrichmentCondition = {
            'owners.id': user.sub,
            $or: [
                {'enrichmentResults.score': { $exists: true, $ne: null }},
                {'enrichmentResults.knownDuplicates.0': { $exists: true, $ne: null }},
                {'enrichmentResults.knownSubsets.0': { $exists: true, $ne: null }}
            ]
        };

        if (!isAdmin(user)) {
            enrichmentCondition["owners.id"] = user.sub;
        }

        const enrichmentCursor = await DataObject.find(enrichmentCondition).lean().cursor()

        for (let doc = await enrichmentCursor.next(); doc !== null; doc = await enrichmentCursor.next()) {
            const { score } = doc.enrichmentResults;
            if (score || score === 0) {
                if (!scores[String(score)]) scores[String(score)] = 0;
                scores[String(score)]++;
            }

            if (doc.enrichmentResults.knownDuplicates) allDuplicates = allDuplicates.concat(doc.enrichmentResults.knownDuplicates);
            if (doc.enrichmentResults.knownSubsets) allSubsets = allSubsets.concat(doc.enrichmentResults.knownSubsets);
        }

        allDuplicates = _.uniq(allDuplicates);
        allSubsets = _.uniq(allSubsets);

        // Find only objects without any duplicates or subsets
        const uniqueCondition = {
            'owners.id': user.sub,
            'enrichmentResults.knownDuplicates.0': { $exists: false },
            'enrichmentResults.knownSubsets.0': { $exists: false }
        };

        if (!isAdmin(user)) {
            enrichmentCondition["owners.id"] = user.sub;
        }

        const uniqueCount = await DataObject.count(uniqueCondition)

        ctx.status = 200;
        ctx.body = {
            data: {
                scores,
                duplicateCount: allDuplicates.length,
                subsetCount: allSubsets.length,
                uniqueCount
            }
        };
    }
}
