const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const App = require('./src/App.js');

(async () => {
    try {
        const app = new App();
        await app.start();
    } catch (e) {
        console.error('Critical error, going to die', e, e && e.stack); //eslint-disable-line
        process.exit(1); //eslint-disable-line no-process-exit
    }
})();

