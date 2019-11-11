import { RouterContext } from 'koa-router';
import {Entry, Logging} from '@google-cloud/logging';
import {ConfigStore, Logger} from 'backend-commons-lib';
import BadRequest from '../../errors/api/BadRequest';

interface ILogsControllerOptions {
    config: ConfigStore;
    logger: Logger;
}

interface IGetLogsParams {
    flowId: string;
    stepId: string;
}

interface IGetLogsQuery {
    pageSize?: string;
    pageToken?: string;
}

export default class LogsController {
    private config: ConfigStore;
    private logger: Logger;
    private gcloudLogging: Logging;

    public constructor({config, logger}: ILogsControllerOptions) {
        this.config = config;
        this.logger = logger;
        this.gcloudLogging = new Logging({
            keyFilename: config.get('GOOGLE_APPLICATION_CREDENTIALS')
        });
    }

    public async getOne(ctx: RouterContext): Promise<void> {
        const { flowId, stepId } = <IGetLogsParams>ctx.params;
        let { pageSize = 1000, pageToken } = <IGetLogsQuery>ctx.query;

        pageSize = parseInt(pageSize as string, 10);
        if (Number.isNaN(pageSize)) {
            throw new BadRequest('pageSize should be a valid number');
        }

        const options = {
            pageSize,
            pageToken,
            filter: `resource.type=k8s_container AND labels.k8s-pod/stepId=${stepId} AND labels.k8s-pod/flowId=${flowId}`
        };

        const [entries, request, response] = await this.gcloudLogging.getEntries(options);

        ctx.body = {
            data: entries ? entries.map((entry: Entry) => ({
                timestamp: entry.metadata.timestamp,
                message: entry.data
            })) : [],
            meta: {
                pageSize,
                nextPageToken: response.nextPageToken
            }
        };
    }
}
