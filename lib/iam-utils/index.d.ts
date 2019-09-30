/// <reference types="node" />

import { RouterContext } from 'koa-router';
export function koaMiddleware(ctx: RouterContext, next: () => Promise<any>): Promise<any>;
