require('dotenv').config();
const logger = require('@basaas/node-logger');
const express = require('express');
const path = require('path');
const compression = require('compression');

const conf = require('./conf');

const log = logger.getLogger(`${conf.logging.namespace}/main`);

const DOCUMENT_ROOT = path.resolve(__dirname, '../', 'build');
const STATIC_ROOT = path.resolve(DOCUMENT_ROOT, 'static');
const ASSETS_ROOT = path.resolve(DOCUMENT_ROOT, 'assets');

const app = express();

app.get('/healthcheck', compression(), (req, res) => {
    res.sendStatus(200);
});

app.use('/static', compression(), express.static(STATIC_ROOT, { maxAge: '10d' }));
app.use('/assets', compression(), express.static(ASSETS_ROOT, { maxAge: '10d' }));

app.use('/', compression(), express.static(DOCUMENT_ROOT, {
    maxAge: '0',
    setHeaders(res) {
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate'); // HTTP 1.1.
        res.setHeader('Pragma', 'no-cache'); // HTTP 1.0.
        res.setHeader('Expires', '1');
    },
}));

app.disable('x-powered-by');

app.get('/config', compression(), (req, res) => {
    res.json(conf);
});

app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
    res.setHeader('Pragma', 'no-cache'); // HTTP 1.0.
    res.setHeader('Expires', '0');
    res.sendFile(
        'index.html',
        { root: DOCUMENT_ROOT },
    );
});

app.listen(conf.port, () => {
    log.info(`Listening on port ${conf.port}`);
});
