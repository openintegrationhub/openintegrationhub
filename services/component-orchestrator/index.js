const ComponentOrchestratorApp = require('./src/ComponentOrchestratorApp.js');

(async () => {
    try {
        const app = new ComponentOrchestratorApp();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1);
    }
})();
