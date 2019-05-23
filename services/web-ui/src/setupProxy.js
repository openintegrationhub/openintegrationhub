const proxy = require('http-proxy-middleware');
const conf = require('../server/conf');

// eslint-disable-next-line func-names
module.exports = function (app) {
    app.use(proxy([
        '/login',
        '/logout',
        '/api/v1/users/**',
    ], { target: 'http://iam.openintegrationhub.com', changeOrigin: true }));
    // proxy server config
    app.use('/config', (req, res) => {
        res.send(conf);
    });
};
