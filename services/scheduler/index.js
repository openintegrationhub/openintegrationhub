const SchedulerApp = require('./src/SchedulerApp.js');

(async () => {
    try {
        const app = new SchedulerApp();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1);
    }
})();
