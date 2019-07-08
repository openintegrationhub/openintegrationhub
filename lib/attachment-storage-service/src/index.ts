import Koa from 'koa';
import KoaRouter, { IMiddleware } from 'koa-router';
import { Server } from 'http';
import Logger from 'bunyan';
import healthcheck from './routes/healthcheck';
import objects from './routes/objects';
import batch from './routes/batch';
import koaBunyanLogger from 'koa-bunyan-logger';
import koaSwagger from 'koa2-swagger-ui';
import errorResponder from './middleware/error-responder';
import Healthcheckable from './healthcheckable';
import StorageDriver, {
    StorageObject, StorageObjectMetadata, StorageObjectExistsError, DeleteCondition, DeletionStatus
} from './storage-driver';
import * as path from 'path';

export {
    Healthcheckable, StorageDriver, StorageObject, StorageObjectMetadata, StorageObjectExistsError, DeleteCondition,
    DeletionStatus
}

export interface ServerAuth {
    middleware: IMiddleware;
    canGetObject: IMiddleware;
    canPutObject: IMiddleware;
    canDeleteObject: IMiddleware;
    canDeleteMany: IMiddleware;
}

export interface ServerOptions {
    storageDriver: StorageDriver & Healthcheckable;
    config: any;
    logger: Logger;
    auth: ServerAuth;
}

export default class ObjectServer {
    private readonly koa: Koa;
    private readonly api: KoaRouter;
    private server: Server;
    private logger: Logger;

    public constructor({config, logger, storageDriver, auth}: ServerOptions) {
        this.api = new KoaRouter();
        this.koa = new Koa();
        this.logger = logger;

        this.api
            .get('/', ctx => ctx.body = 'Attachment Storage Service')
            .use('/healthcheck', healthcheck([storageDriver]))
            .use('/objects', objects(storageDriver, auth))
            .use('/batch', batch(storageDriver, auth));

        const swaggerUI = koaSwagger({
            routePrefix: '/api-docs',
            swaggerOptions: {
                spec: require(path.join(__dirname, '../docs/swagger/openapi.json'))
            },
        });

        this.koa
            .use(koaBunyanLogger(this.logger))
            .use(koaBunyanLogger.requestIdContext())
            .use(koaBunyanLogger.requestLogger())
            .use(errorResponder)
            .use(this.api.routes())
            .use(this.api.allowedMethods())
            .use(swaggerUI);
    }

    public get serverCallback(): Function {
        return this.koa.callback();
    }

    public listen(port: number) {
        this.logger.info('Going to start server');
        this.server = this.koa.listen(port);
        this.logger.info({port}, 'Server listening');
    }

    public close(): void {
        if (this.server) {
            this.server.close();
        }
    }
}
