const WebhooksApp = require('./src/WebhooksApp.js');
(async () => {
    try {
        const app = new WebhooksApp();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1); //eslint-disable-line no-process-exit
    }
})();

