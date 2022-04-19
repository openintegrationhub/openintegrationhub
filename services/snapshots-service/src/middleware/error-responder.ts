import { Context } from 'koa';
import ApiError from '../errors/api/ApiError';

export default async function errorResponder(ctx: Context, next: Function): Promise<void> {
    try {
        await next();
    } catch (err: any) {
        if (!(err instanceof ApiError) && !err.status) {
            ctx.log.error(err);
            err = new ApiError(err.status, err.message);
        }

        ctx.body = {
            errors: [
                {
                    message: err.message
                }
            ]
        };

        ctx.status = err.status || 500;
    }
}
