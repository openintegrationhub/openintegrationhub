const express = require('express');

const rootLogger = require('@elastic.io/bunyan-logger');
const commons = require('@elastic.io/commons');
const version = commons.version;

const params = require('./params.js');
const requestBin = require('./requestbin.js');
const webhooks = require('./webhook.js');
const WebHook = webhooks.WebHook;
const init = require('./init.js');
const bodyParser = require('./bodyParser');


const TASK_ID_PARAM = 'taskId';
const WEBHOOK_ROUTE_PATH = `/hook/(:${TASK_ID_PARAM})(/\\w*)?`;

const REQUEST_ID_HEADER = 'x-request-id';

function generateRequestId() {
    // NOTE the result should be in the same format as provided by proxy in from of this server (nginx)
    const numbers = [];
    for (let i = 0; i < 32; i++) {
        numbers[i] = Math.floor(Math.random() * 16).toString(16);
    }
    return numbers.join('');
}

async function createApp() {
    const mongo = init.getMongoConnection();
    const amqp = init.getAmqpConnection();
    const config = init.getConfig();

    rootLogger.trace('Webhooks version:', version.version);

    const app = express();

    app.use(WEBHOOK_ROUTE_PATH, (req, res, next) => {
        const incomingId = String(req.headers[REQUEST_ID_HEADER]);

        if (/^[0-9a-f]{32}$/.test(incomingId)) {
            req.id = incomingId;
        } else {
            const generatedRequestId = generateRequestId();
            rootLogger.warn({
                incomingId,
                generatedRequestId
            }, `header ${REQUEST_ID_HEADER} is invalid or not provided`);
            req.id = generatedRequestId;
        }

        next();
    });

    app.use((req, res, next) => {
        res.header('X-Powered-By', 'elastic.io');
        next();
    });

    bodyParser(app, {
        limit: config.get('PAYLOAD_SIZE_LIMIT')
    });

    app.get('/', version.getVersion);

    app.param(TASK_ID_PARAM, params.taskIdParam);

    app.get('/healthcheck', commons.healthcheck.createHealthCheck({
        amqp,
        mongo
    }));

    const [readChannel, writeChannel] = await Promise.all([amqp.createChannel(), amqp.createChannel()]);
    rootLogger.trace('Publisher channel created');

    const webHook = new WebHook(readChannel, writeChannel);

    app.use(WEBHOOK_ROUTE_PATH, requestBin.requestBinSuccess);

    app.post(WEBHOOK_ROUTE_PATH, webHook.handle.bind(webHook));

    app.head(WEBHOOK_ROUTE_PATH, webHook.verify.bind(webHook));

    app.get(WEBHOOK_ROUTE_PATH, webHook.handle.bind(webHook));

    app.use(WEBHOOK_ROUTE_PATH, requestBin.requestBinErrors);

    app.disconnect = () => Promise.all([
        amqp.close(),
        mongo.close()
    ]);
    return app;
}

exports.createApp = createApp;
