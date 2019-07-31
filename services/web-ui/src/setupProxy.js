const proxy = require('http-proxy-middleware');
const conf = require('../server/conf');

const ORIGIN = 'http://web-ui.openintegrationhub.com';

// eslint-disable-next-line func-names
module.exports = function (app) {
    app.use(proxy('/iam-api', {
        pathRewrite: { '^/iam-api': '/' },
        target: 'http://iam.openintegrationhub.com',
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));

    app.use(proxy('/flow-api', {
        pathRewrite: { '^/flow-api': '/' },
        target: 'http://flow-repository.openintegrationhub.com',
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));

    app.use(proxy('/component-api', {
        pathRewrite: { '^/component-api': '/' },
        target: 'http://component-repository.openintegrationhub.com',
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));
    app.use(proxy('/metadata-api', {
        pathRewrite: { '^/metadata-api': '/' },
        target: 'http://metadata.openintegrationhub.com/api/v1',
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));
    // proxy server config
    app.use('/config', (req, res) => {
        res.send(conf);
    });
};
