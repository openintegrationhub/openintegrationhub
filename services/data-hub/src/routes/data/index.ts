import koaRouter from 'koa-router';
import Controller from './controller';
import { RouterContext } from 'koa-router';
import bodyParser from 'koa-bodyparser';

export default () => {
    const controller = new Controller();
    return new koaRouter()
        .use(bodyParser())
        .get('/:id', (ctx: RouterContext) => controller.getOne(ctx))
        .post('/', (ctx: RouterContext) => controller.create(ctx))
        .routes();
}
