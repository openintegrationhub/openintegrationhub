const ResourceCoordinatorApp = require('./src/ResourceCoordinatorApp.js');

(async () => {
    try {
        const app = new ResourceCoordinatorApp();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1);
    }
})();
