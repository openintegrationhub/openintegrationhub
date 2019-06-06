import StorageDriver from '../../storage-driver';
import { ServerAuth } from '../../index';
import { Context } from 'koa';
import koaRouter from 'koa-router';
import Controller from './controller';
import Unauthorized from '../../errors/api/Unauthorized';

export default (objectsStorage: StorageDriver, auth: ServerAuth) => {
    const controller = new Controller(objectsStorage);
    const getOne = controller.getOne.bind(controller);
    const put = controller.save.bind(controller);
    const loadObject = controller.loadObject.bind(controller);
    const canGetObject = auth.canGetObject.bind(auth);
    const canPutObject = auth.canPutObject.bind(auth);

    const idRouter = new koaRouter()
        .get('/', loadObject, canGetObject, getOne)
        .put('/', canPutObject, put)
        .routes();

    const initLogger = (ctx: Context, next: () => Promise<any>) => {
        ctx.log = ctx.log.child({id: ctx.params.id});
        return next();
    };

    return new koaRouter()
        .use((ctx: Context, next) => {
            // handling jwt error according to https://github.com/koajs/jwt#example
            return next().catch((err) => {
                if (err.status === 401) {
                    throw new Unauthorized();
                } else {
                    throw err;
                }
            });
        })
        .use(auth.middleware.bind(auth))
        .use('/:id', initLogger, idRouter)
        .routes();
}
