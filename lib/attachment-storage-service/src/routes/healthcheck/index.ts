import koaRouter from 'koa-router';
import Controller from './controller';
import { Context } from 'koa';
import Healthcheckable from '../../healthcheckable';

export default (objects: Healthcheckable[]) => {
    const controller = new Controller(objects);
    return new koaRouter()
        .get('/', (ctx: Context) => controller.healthcheck(ctx))
        .routes();
}
