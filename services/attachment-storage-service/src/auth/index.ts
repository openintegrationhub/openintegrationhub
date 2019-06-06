import { koaMiddleware } from '@openintegrationhub/iam-utils';
import { RouterContext } from 'koa-router';
type Next = () => Promise<any>;

export default class Auth {
    public async middleware(ctx: RouterContext, next: Next): Promise<any> {
        await koaMiddleware(ctx, () => {
            const { user } = ctx.state;
            ctx.state.metadata = {
                userId: user.sub
            };
            return next();
        });
    }

    public async canGetObject(ctx: RouterContext, next: Next): Promise<any> {
        //allowed to everybody
        return next();
    }

    public async canPutObject(ctx: RouterContext, next: Next): Promise<any> {
        //allowed to everybody
        return next();
    }
}
