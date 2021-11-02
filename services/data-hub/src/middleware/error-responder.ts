import { Context } from 'koa';
import ApiError from '../errors/api/ApiError';

export default async function errorResponder(ctx: Context, next: Function): Promise<void> {
    try {
        await next();
    } catch (err) {
        // @ts-ignore
        if (!(err instanceof ApiError) && !err.status) {
            ctx.log.error(err);
            // @ts-ignore
            err = new ApiError(err.status, err.message);
        }
        ctx.body = {
            errors: [
                {
                    // @ts-ignore
                    message: err.message
                }
            ]
        };
        // @ts-ignore
        ctx.status = err.status || 500;
    }
}
