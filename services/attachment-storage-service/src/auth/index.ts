import { Context } from 'koa';

type Next = () => Promise<any>; // don't know if it's correct

export default class Auth {
    public constructor() {

    }

    public async middleware(ctx: Context, next: Next) {
        ctx.state.metadata = {};
        return next();
    }

    public async canGetObject(ctx: Context, next: Next) {
        //allowed to everybody
        return next();
    }

    public async canPutObject(ctx: Context, next: Next) {
        //allowed to everybody
        return next();
    }
}
