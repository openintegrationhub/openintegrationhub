import KoaRouter from 'koa-router';
import Controller from './controller';
import { RouterContext } from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { parsePagedQuery } from './middlewares';
import { koaMiddleware } from '@openintegrationhub/iam-utils';

export default () => {
    const controller = new Controller();
    return new KoaRouter()
        .use(bodyParser({
            // TODO: Add process.env to set jsonLimit
            jsonLimit: "10mb"
        }))
        .use(koaMiddleware)
        .get('/', parsePagedQuery(), (ctx: RouterContext) => controller.getMany(ctx))
        .post('/enrich', parsePagedQuery(), (ctx: RouterContext) => controller.applyFunctions(ctx))
        .post('/', (ctx: RouterContext) => controller.postOne(ctx))
        .post('/import', (ctx: RouterContext) => controller.postMany(ctx))
        .get('/status', (ctx: RouterContext) => controller.getRecordCount(ctx))
        .get('/statistics', (ctx: RouterContext) => controller.getStatistics(ctx))
        .get('/:id', (ctx: RouterContext) => controller.getOne(ctx))
        .get('/recordId/:id', (ctx: RouterContext) => controller.getOneByRecordId(ctx))
        .delete('/:id/:recordId', (ctx: RouterContext) => controller.getOneByIdAndDeleteRecordId(ctx))
        .post('/recordId', (ctx: RouterContext) => controller.postByRecordId(ctx))
        .put('/:id', (ctx: RouterContext) => controller.putOne(ctx))
        .patch('/:id', (ctx: RouterContext) => controller.patchOne(ctx))
        .routes();
}
