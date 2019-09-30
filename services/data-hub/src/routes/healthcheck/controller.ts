import { Context } from 'koa';
import IHealthcheckable from '../../healthcheckable';

export default class HealthcheckController {
    private readonly objects: IHealthcheckable[];

    public constructor(objects: IHealthcheckable[]) {
        this.objects = objects;
    }

    public async healthcheck(ctx: Context) {
        await Promise.all(this.objects.map(o => o.healthcheck()));
        ctx.status = 200;
        ctx.body = 'OK';
    }
}
