const proxy = require('http-proxy-middleware');
const conf = require('../server/conf');

const ORIGIN = 'https://web-ui.openintegrationhub.com';

// eslint-disable-next-line func-names
module.exports = function (app) {
    app.use(proxy('/iam-api', {
        pathRewrite: { '^/iam-api': '/' },
        target: conf.endpoints.iam,
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));

    app.use(proxy('/flow-api', {
        pathRewrite: { '^/flow-api': '/' },
        target: conf.endpoints.flow,
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));

    app.use(proxy('/app-directory-api', {
        pathRewrite: { '^/app-directory-api': '/' },
        target: conf.endpoints.appDirectory,
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));

    app.use(proxy('/component-api', {
        pathRewrite: { '^/component-api': '/' },
        target: conf.endpoints.component,
        changeOrigin: true,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));
    app.use(proxy('/metadata-api', {
        pathRewrite: { '^/metadata-api': '/' },
        changeOrigin: true,
        target: conf.endpoints.metadata,
        onProxyReq(proxyReq) {
            // add custom header to request
            proxyReq.setHeader('Origin', ORIGIN);
            // or log the req
        },
    }));

    app.use(proxy('/secrets-api', {
        pathRewrite: { '^/secrets-api': '/' },
        target: 'http://127.0.0.1:9001/api/v1',
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
