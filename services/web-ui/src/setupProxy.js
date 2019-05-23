const proxy = require('http-proxy-middleware');
const conf = require('../server/conf');

// eslint-disable-next-line func-names
module.exports = function (app) {
    // proxy server config
    app.use('/config', (req, res) => {
        res.send(conf);
    });

    app.use(proxy('/login', { target: 'http://iam.openintegrationhub.com', changeOrigin: true }));
};
