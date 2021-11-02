import { IMiddleware, RouterContext } from 'koa-router';
import assert from 'assert';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;

export function parsePagedQuery (): IMiddleware {
    return function middleware (ctx: RouterContext, next: () => Promise<any>) {
        const paging = ctx.query.page || {};
        // @ts-ignore: TS2339
        const page = parseInt(paging.number) || DEFAULT_PAGE;  
        // @ts-ignore: TS2339
        const perPage = parseInt(paging.size) || DEFAULT_PER_PAGE;

        assert(page > 0, 'page[number] parameter should be greater than 0');
        assert(perPage > 0, 'page[size] parameter should be greater than 0');
        assert(perPage <= MAX_PER_PAGE, `page[size] shouldn't be greater than ${MAX_PER_PAGE}`);

        ctx.state.paging = {
            page,
            perPage,
            offset: (page - 1) * perPage,
            limit: perPage
        };

        return next();
    };
}
