import Maester from '.';
import logger from './logger';
import config from './config';

const maester = new Maester(config);
(async () => {
    try {
        await maester.start();
    } catch (e) {
        console.error(e);
        return;
    }

    // delay is needed to wait until k8s network magic really happen and pod is not receiving traffic anymore
    const terminationDelay = config.TERMINATION_DELAY || 15000; // default k8s terminationGracePeriodSeconds = 30s, so 15s here
    const listener = () => setTimeout(async (): Promise<void> => {
        try {
            await maester.stop();
        } catch (e) {
            logger.error('Failed to stop', e);
            process.exit(1);
        }

        process.exit(0);
    }, terminationDelay);

    process.on('SIGINT', listener);
    process.on('SIGTERM', listener);
})();
