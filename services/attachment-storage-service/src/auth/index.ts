import { koaMiddleware } from '@openintegrationhub/iam-utils';
import { RouterContext } from 'koa-router';
type Next = () => Promise<any>;

export default class Auth {
    public constructor() {

    }

    public async middleware(ctx: RouterContext, next: Next) {
        await koaMiddleware(ctx, () => {
            console.log('After Koa middleware', ctx.state);
            ctx.state.metadata = {};
            return next();
        });
    }

    public async canGetObject(ctx: RouterContext, next: Next) {
        //allowed to everybody
        return next();
    }

    public async canPutObject(ctx: RouterContext, next: Next) {
        //allowed to everybody
        return next();
    }
}
