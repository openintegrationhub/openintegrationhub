const express = require('express');
const asyncHandler = require('express-async-handler');
const bodyParser = require('./body-parser');
const logger = require('bunyan');
const FlowsDao = require('./flows-dao');
const assert = require('assert');

const TASK_ID_PARAM = 'id';
const WEBHOOK_ROUTE_PATH = `/hook/(:${TASK_ID_PARAM})(/\\w*)?`;
const REQUEST_ID_HEADER = 'x-request-id';
// Delay in msec with error response
// to prevent try-and-error way to find
// suitable webhook IDs
const ANTIHACK_RESPONSE_DELAY = 1000;

function generateRequestId() {
    // NOTE the result should be in the same format as provided by proxy in from of this server (nginx)
    const numbers = [];
    for (let i = 0; i < 32; i++) {
        numbers[i] = Math.floor(Math.random() * 16).toString(16);
    }
    return numbers.join('');
}

async function requireContentType(req, res, next) {
    //if content-type is omitted in POST throw 415
    if (!req.headers['content-type']) {
        const err = new Error('Content-Type header is missing');
        err.statusCode = 415;
        throw err;
    }
    return next();
}

function ensureRequestId(req, res, next) {
    const incomingId = String(req.headers[REQUEST_ID_HEADER]);
    const logger = req.logger;

    if (/^[0-9a-f]{32}$/.test(incomingId)) {
        req.id = incomingId;
    } else {
        const generatedRequestId = generateRequestId();
        logger.warn({
            incomingId,
            generatedRequestId
        }, `header ${REQUEST_ID_HEADER} is invalid or not provided`);
        req.id = generatedRequestId;
    }

    req.logger = req.logger.child({
        requestId: req.id
    });

    return next();
}

function addPoweredBy(req, res, next) {
    res.header('X-Powered-By', 'elastic.io'); //@todo: remove this
    return next();
}

function errorHandler(err, req, res, next) { //eslint-disable-line no-unused-vars
    res.status(err.statusCode || 500).json({
        error: err.message
    });
}

class Api {
    constructor(config, flowsDao) {
        assert(flowsDao instanceof FlowsDao, 'flowsDao has to be an instance of FlowsDao');
        this._config = config;
        this._flowsDao = flowsDao;
        this._logger = logger;

        const app = express();
        app.use(addPoweredBy);

        bodyParser(app, { limit: config.get('PAYLOAD_SIZE_LIMIT') });

        app.use((req, res, next) => {
            req.logger = this._logger;
            return next();
        });
        app.get('/', asyncHandler(this.handleRoot.bind(this)));
        app.get('/healthcheck', asyncHandler(this.handleHealthCheck.bind(this)));

        app.param(TASK_ID_PARAM, this.handleFlowIdParam.bind(this));
        app.use(WEBHOOK_ROUTE_PATH, asyncHandler(ensureRequestId));
        app.use(WEBHOOK_ROUTE_PATH, asyncHandler(this.preHandle.bind(this)));
        app.head(WEBHOOK_ROUTE_PATH, asyncHandler(this.handleHead.bind(this)));
        app.get(WEBHOOK_ROUTE_PATH, asyncHandler(this.handleGet.bind(this)));
        app.post(WEBHOOK_ROUTE_PATH, asyncHandler(requireContentType), asyncHandler(this.handlePost.bind(this)));
        app.use(WEBHOOK_ROUTE_PATH, asyncHandler(this.handleErrors.bind(this)));

        app.use(errorHandler);

        this._app = app;
    }

    async handleFlowIdParam(req, res, next, flowId) {
        try {
            const logger = req.logger.child({ flowId });
            logger.info('Retrieving flow');
            const flow = await this._flowsDao.findById(flowId);

            if (!flow) {
                await new Promise(res => setTimeout(res, ANTIHACK_RESPONSE_DELAY));
                const err = new Error(`Flow ${flowId} either does not exist or is inactive.`);
                err.statusCode = 404;
                logger.error(err, `Sending 404 response`);
                throw err;
            }

            req.task = flow;
            req.logger = logger;

            return next();
        } catch (e) {
            return next(e);
        }
    }

    handleRoot(req, res, next) {
        if (this._rootHandler) {
            return this._rootHandler(req, res, next);
        }

        return res.send('OK');
    }

    handleHealthCheck(req, res, next) {
        if (this._healthCheckHandler) {
            return this._healthCheckHandler(req, res, next);
        }

        return res.send('OK');
    }

    handleHead(req, res, next) {
        //@todo: default behaviour
        return this._headHandler(req, res, next);
    }

    handleGet(req, res, next) {
        //@todo: default behaviour
        return this._getHandler(req, res, next);
    }

    handlePost(req, res, next) {
        //@todo: default behaviour
        return this._postHandler(req, res, next);
    }

    preHandle(req, res, next) {
        //@todo: default behaviour
        return this._preHandler(req, res, next);
    }

    handleErrors(err, req, res, next) {
        //@todo: default behaviour
        return this._errorHandler(err, req, res, next);
    }

    setPreHandler(handler) {
        this._preHandler = handler;
    }

    setErrorHandler(handler) {
        this._errorHandler = handler;
    }

    setRootHandler(handler) {
        this._rootHandler = handler;
    }

    setHeadHandler(handler) {
        this._headHandler = handler;
    }

    setGetHandler(handler) {
        this._getHandler = handler;
    }

    setPostHandler(handler) {
        this._postHandler = handler;
    }

    setLogger(logger) {
        this._logger = logger;
    }

    listen(port) {
        this.getApp().listen(port);
    }

    getApp() {
        return this._app;
    }
}

module.exports = Api;
