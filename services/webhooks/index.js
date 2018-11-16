const rootLogger = require('@elastic.io/bunyan-logger');
const hooks = require('./lib/hooks');
const init = require('./lib/init.js');

(async () => {
    await init.init();
    const app = await hooks.createApp();
    const config = init.getConfig();
    const port = config.get('PORT_GATEWAY');
    app.listen(port, () => rootLogger.info('Listening on ' + port));
})().catch(err => {
    rootLogger.error(err);
    process.exit(1);
});
