import { Context } from 'koa';
import ApiError from '../errors/api/ApiError';

export default async function errorResponder(ctx: Context, next: Function): Promise<void> {
    try {
        await next();
    } catch (err) {
        if (!(err instanceof ApiError)) {
            ctx.log.error(err);
            err = new ApiError();
        }

        ctx.body = {
            errors: [
                {
                    message: err.message
                }
            ]
        };
        ctx.status = err.status;
    }
}
