const express = require('express');
const asyncHandler = require('express-async-handler');
const bodyParser = require('./body-parser');
const logger = require('bunyan').createLogger({ name: 'http-api' });
const FlowsDao = require('./flows-dao');
const assert = require('assert');
const cors = require('cors');

const FLOW_ID_PARAM = 'id';
const WEBHOOK_ROUTE_PATH = `/hook/(:${FLOW_ID_PARAM})(/\\w*)?`;
const REQUEST_ID_HEADER = 'x-request-id';
// Delay in msec with error response
// to prevent try-and-error way to find
// suitable webhook IDs
const ANTIHACK_RESPONSE_DELAY = 1000;

//@todo move to class
function generateRequestId() {
    // NOTE the result should be in the same format as provided by proxy in from of this server (nginx)
    const numbers = [];
    for (let i = 0; i < 32; i++) {
        numbers[i] = Math.floor(Math.random() * 16).toString(16);
    }
    return numbers.join('');
}

//@todo move to class
async function requireContentType(req, res, next) {
    //if content-type is omitted in POST throw 415
    if (!req.headers['content-type']) {
        const err = new Error('Content-Type header is missing');
        err.statusCode = 415;
        throw err;
    }
    return next();
}

//@todo move to class
function ensureRequestId(req, res, next) {
    const incomingId = req.headers[REQUEST_ID_HEADER];
    const logger = req.logger;

    if (incomingId) {
        req.id = incomingId;
    } else {
        const generatedRequestId = generateRequestId();
        logger.warn({
            incomingId,
            generatedRequestId
        }, `header ${REQUEST_ID_HEADER} is not provided`);
        req.id = generatedRequestId;
    }

    req.logger = req.logger.child({
        requestId: req.id
    });

    return next();
}

//@todo move to class
function errorHandler(err, req, res, next) { //eslint-disable-line no-unused-vars
    res.status(err.status || err.statusCode || 500).json({
        error: err.message
    });
}


/**
 * Sets up http API.
 */
class HttpApi {
    /**
     * @param {object} opts
     * @param {Config} opts.config
     * @param {FlowsDao} opts.flowsDao
     */
    constructor({ config, flowsDao }) {
        assert(flowsDao instanceof FlowsDao, 'flowsDao has to be an instance of FlowsDao');
        this._flowsDao = flowsDao;
        this._logger = logger;

        const app = express();
        app.disable('x-powered-by');

        bodyParser(app, { limit: config.get('PAYLOAD_SIZE_LIMIT') });

        const whitelist = (() => {
            const wl = config.get('CORS_ORIGIN_WHITELIST') || '';
            return wl ? wl.split(',') : [];
        })();

        // For development, add localhost to permitted origins
        if (process.env.NODE_ENV !== 'production') {
            whitelist.push('http://localhost:3001');
        }

        const corsOptions = {
            origin(origin, callback) {
                if (whitelist.indexOf(origin) !== -1 || !origin) {
                    callback(null, true);
                } else {
                    logger.info('Blocked by CORS');
                    logger.info(origin);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
        };

        // Enables preflight OPTIONS requests
        app.options('/', cors());

        app.use((req, res, next) => {
            req.logger = this._logger;
            return next();
        });

        // setup cors per endpoint
        app.use(WEBHOOK_ROUTE_PATH, cors(corsOptions));

        app.get('/', asyncHandler(this.handleRoot.bind(this)));
        app.get('/healthcheck', asyncHandler(this.handleHealthCheck.bind(this)));

        app.param(FLOW_ID_PARAM, this.handleFlowIdParam.bind(this));
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

            req.flow = flow;
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
        if (this._preHandler) {
            return this._preHandler(req, res, next);
        }
        return next();
    }

    handleErrors(err, req, res, next) {
        if (this._errorHandler) {
            return this._errorHandler(err, req, res, next);
        }
        return next();
    }

    setPreHandler(handler) {
        this._preHandler = handler;
    }

    setHealthcheckHandler(handler) {
        this._healthCheckHandler = handler;
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

    /**
     * Set a logger.
     * @param {Logger} logger
     */
    setLogger(logger) {
        this._logger = logger;
    }

    /**
     * Start listening on specified port.
     * @param {number} port
     */
    listen(port) {
        this.getApp().listen(port);
    }

    /**
     * Get express app instance.
     * @returns {app} - Express app instance
     */
    getApp() {
        return this._app;
    }
}

module.exports = HttpApi;
