/// <reference types="node" />

declare module '@openintegrationhub/iam-utils' {
    import { RouterContext } from 'koa-router';
    export function koaMiddleware(ctx: RouterContext, next: () => Promise<any>): Promise<any>;
}
