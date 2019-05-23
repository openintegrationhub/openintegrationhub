const proxy = require('http-proxy-middleware');

// eslint-disable-next-line func-names
module.exports = function (app) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    app.use('/iam-endpoint', proxy({
        pathRewrite(path, req) {
            console.log(path);
            console.log(path.replace('/iam-endpoint/', '/'));
            return path.replace('/iam-endpoint/', '/');
        },
        onProxyRes(proxyRes, req, res) {
            console.log(proxyRes);
        },
        onError(err, req, res) {
            console.log(err);
            res.writeHead(500, {
                'Content-Type': 'text/plain',
            });
            res.end(
                'Something went wrong. And we are reporting a custom error message.',
            );
        },
        target: 'http://localhost:3002',
        logLevel: 'debug',
    }));
};
