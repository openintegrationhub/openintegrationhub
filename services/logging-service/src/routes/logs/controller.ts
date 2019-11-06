import { RouterContext } from 'koa-router';
import { Logging } from '@google-cloud/logging';
import {ConfigStore, Logger} from 'backend-commons-lib';

interface ILogsControllerOptions {
    config: ConfigStore;
    logger: Logger;
}

export default class LogsController {
    private config: ConfigStore;
    private logger: Logger;
    private gcloudLogging: Logging;

    public constructor({config, logger}: ILogsControllerOptions) {
        this.config = config;
        this.logger = logger;
        this.gcloudLogging = new Logging({
            keyFilename: config.get('GOOGLE_APPLICATION_CREDENTIALS'),
            credentials: config.get('GCLOUD_CREDENTIALS') // credentials as JSON
        });
    }

    public async getOne(ctx: RouterContext): Promise<void> {
        const { flowId, stepId } = ctx.params;
        const options = {
            pageSize: 10,
            filter: `resource.type=k8s_container AND labels.k8s-pod/stepId=${stepId} AND labels.k8s-pod/flowId=${flowId}`
        };

        const [entries] = await this.gcloudLogging.getEntries(options);

        ctx.body = {
            data: entries
        };
    }
}
