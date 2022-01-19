import KoaRouter from 'koa-router';
import Controller from './controller';
import { RouterContext } from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { koaMiddleware } from '@openintegrationhub/iam-utils';

export default () => {
    const controller = new Controller();
    return new KoaRouter()
        .use(bodyParser())
        .use(koaMiddleware)
        .delete('/', (ctx: RouterContext) => controller.deleteMany(ctx))
        .get('/flows/:flowId/steps', (ctx: RouterContext) => controller.getAll(ctx))
        .get('/flows/:flowId/steps/:stepId', (ctx: RouterContext) => controller.getOne(ctx))
        .delete('/flows/:flowId/steps/:stepId', (ctx: RouterContext) => controller.deleteOne(ctx))
        .routes();
}
