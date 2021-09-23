import { Context } from 'koa';
import koaRouter from 'koa-router';
import bodyParser from 'koa-bodyparser';
import StorageDriver from '../../storage-driver';
import { ServerAuth } from '../../index';
import Controller from './controller';
import Unauthorized from '../../errors/api/Unauthorized';

export default (objectsStorage: StorageDriver, auth: ServerAuth) => {
    const controller = new Controller(objectsStorage);
    const deleteMany = controller.deleteMany.bind(controller);
    const getDeletionStatus = controller.getDeletionStatus.bind(controller);
    const canDeleteMany = auth.canDeleteMany.bind(auth);

    return new koaRouter()
        .use(bodyParser())
        .use((ctx: Context, next: any) => {
            // handling jwt error according to https://github.com/koajs/jwt#example
            return next().catch((err: any) => {
                if (err.status === 401) {
                    throw new Unauthorized();
                } else {
                    throw err;
                }
            });
        })
        .use(auth.middleware.bind(auth))
        .get('/delete/:id', getDeletionStatus)
        .post('/delete', canDeleteMany, deleteMany)
        .routes();
}
