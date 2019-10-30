import { RouterContext } from 'koa-router';
import NotFound from '../../errors/api/NotFound';
import Unauthorized from '../../errors/api/Unauthorized';

interface IGteQuery {
    $gte: string;
}

export default class DataController {
    public async getMany(ctx: RouterContext): Promise<void> {

    }

    public async getOne(ctx: RouterContext): Promise<void> {

    }

    public async putOne(ctx: RouterContext): Promise<void> {

    }

    public async patchOne(ctx: RouterContext): Promise<void> {

    }

    public async postOne(ctx: RouterContext): Promise<void> {

    }
}
