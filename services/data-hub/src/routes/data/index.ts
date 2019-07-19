import KoaRouter from 'koa-router';
import Controller from './controller';
import { RouterContext } from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { parsePagedQuery } from './middlewares';

export default () => {
    const controller = new Controller();
    return new KoaRouter()
        .use(bodyParser())
        .get('/', parsePagedQuery(), (ctx: RouterContext) => controller.getMany(ctx))
        .post('/', (ctx: RouterContext) => controller.postOne(ctx))
        .get('/:id', (ctx: RouterContext) => controller.getOne(ctx))
        .put('/:id', (ctx: RouterContext) => controller.putOne(ctx))
        .patch('/:id', (ctx: RouterContext) => controller.patchOne(ctx))
        .routes();
}
