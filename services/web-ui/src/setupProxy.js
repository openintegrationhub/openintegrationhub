const proxy = require('http-proxy-middleware');
const conf = require('../server/conf');

// eslint-disable-next-line func-names
module.exports = function (app) {
    app.use(proxy('/iam-api', {
        pathRewrite: { '^/iam-api': '/' },
        target: 'http://iam.openintegrationhub.com',
        changeOrigin: true,
    }));
    // proxy server config
    app.use('/config', (req, res) => {
        res.send(conf);
    });
};
