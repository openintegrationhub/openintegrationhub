/// <reference types="node" />

import { RouterContext } from 'koa-router';
export function koaMiddleware(ctx: RouterContext, next: () => Promise<any>): Promise<any>;
export function isAdmin(user: any): boolean;
export function isTenantAdmin(user:any): boolean;