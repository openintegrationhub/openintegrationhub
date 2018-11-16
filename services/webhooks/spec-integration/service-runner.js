//FIXME @see https://github.com/elasticio/commons/issues/811
process.env.ENVIRONMENT = 'integration_test';

const http = require('http');
const hooks = require('./../lib/hooks');
const init = require('./../lib/init.js');

module.exports = async function () {
    await init.init();
    const app = await hooks.createApp();
    const config = init.getConfig();
    const port = config.get('PORT_GATEWAY');
    //FUCK express it has no "close" method
    const server = http.createServer(app);
    server.listen(port);
    return server;
};
