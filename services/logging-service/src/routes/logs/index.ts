import KoaRouter from 'koa-router';
import Controller from './controller';
import { RouterContext } from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { koaMiddleware } from '@openintegrationhub/iam-utils';
import { ConfigStore, Logger } from 'backend-commons-lib';

interface ILogsRouterOptions {
    config: ConfigStore;
    logger: Logger;
}

export default ({config, logger}: ILogsRouterOptions) => {
    const controller = new Controller({config, logger});
    return new KoaRouter()
        .use(bodyParser())
        // .use(koaMiddleware)
        .get('/flows/:flowId/steps/:stepId', (ctx: RouterContext) => controller.getOne(ctx))
        .routes();
}
