import { koaMiddleware } from '@openintegrationhub/iam-utils';
import { RouterContext } from 'koa-router';
import { StorageObject, ServerAuth } from '@openintegrationhub/attachment-storage-service';
type Next = () => Promise<any>;

interface IamUser {
    sub: string;
    isAdmin: boolean;
}

export default class Auth implements ServerAuth {
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
        const { user, object } = ctx.state;
        if (!this.isCurrentUserOwner(user, object)) {
            throw new Error('Unauthorized');
        }
        return next();
    }

    public async canPutObject(ctx: RouterContext, next: Next): Promise<any> {
        //allowed to every authenticated user
        return next();
    }

    public async canDeleteObject(ctx: RouterContext, next: Next): Promise<any> {
        const { user, object } = ctx.state;
        if (!this.isCurrentUserOwner(user, object)) {
            throw new Error('Unauthorized');
        }
        return next();
    }

    public async canDeleteMany(ctx: RouterContext, next: Next): Promise<any> {
        const { user }: { user: IamUser } = ctx.state;
        if (user.isAdmin) {
            return next();
        }
        throw new Error('Unauthorized');
    }

    private isCurrentUserOwner(user: IamUser, object: StorageObject) {
        const metadata = object.getMetadata();
        return metadata.userId === user.sub;
    }
}
