import { Context } from 'koa';
import Healthcheckable from '../../healthcheckable';

export default class HealthcheckController {
    private readonly objects: Healthcheckable[];

    public constructor(objects: Healthcheckable[]) {
        this.objects = objects;
    }

    public async healthcheck(ctx: Context) {
        await Promise.all(this.objects.map(o => o.healthcheck()));
        ctx.status = 200;
        ctx.body = 'OK';
    }
}
