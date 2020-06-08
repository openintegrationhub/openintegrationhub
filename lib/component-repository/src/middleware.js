const assert = require('assert');
const _ = require('lodash');
const cors = require('cors');

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;

function parsePagedQuery () {
    return function middleware (req, res, next) {
        const paging = req.query.page || {};
        const page = parseInt(paging.number) || DEFAULT_PAGE;
        const perPage = parseInt(paging.size) || DEFAULT_PER_PAGE;

        try {
            assert(page > 0, 'page[number] parameter should be greater than 0');
            assert(perPage > 0, 'page[size] parameter should be greater than 0');
            assert(perPage <= MAX_PER_PAGE, `page[size] shouldn't be greater than ${MAX_PER_PAGE}`);
        } catch (err) {
            return next(err);
        }

        req.paging = {
            page,
            perPage,
            offset: (page - 1) * perPage,
            limit: perPage
        };

        return next();
    };
}

function formatAndRespond() {
    return (req, res, next) => {
        if (res.statusCode === 204) {
            return res.status(204).end();
        }

        if (_.isUndefined(res.data)) {
            return next(); // goes to default 404 handler
        }

        const data = res.data || null;
        const meta = res.meta || {};
        const paging = req.paging || {};
        const status = res.statusCode || 200;

        if (!_.isEmpty(paging)) {
            meta.page = paging.page;
            meta.perPage = paging.perPage;
            meta.total = res.total;
            meta.totalPages = Math.ceil(res.total / paging.perPage);
        }

        return res.status(status).json({data, meta});
    }
}

function errorHandler() {
    return (err, req, res, next) => { //eslint-disable-line
        const status = err.statusCode || err.status || 500;
        req.logger.warn(err, 'Responding with error');
        return res.status(status).json({
            errors: [{message: err.message || 'Unexpected error'}]
        });
    };
}

function setReqLogger(logger) {
    return (req, res, next) => {
        req.logger = logger;
        return next();
    };
}

function setReqEventBus(eventBus) {
    return (req, res, next) => {
        req.eventBus = eventBus;
        return next();
    };
}

function setReqEvent(eventClass) {
    return (req, res, next) => {
        req.eventClass = eventClass;
        return next();
    };
}

function setCors({whitelist = [], logger}) {
    return cors({
        origin(origin, callback) {
            if (whitelist.indexOf(origin) !== -1 || !origin) {
                callback(null, true);
            } else {
                logger.warn({origin, whitelist}, 'Rejected by CORS');
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    });
}

module.exports = {
    parsePagedQuery,
    formatAndRespond,
    errorHandler,
    setReqLogger,
    setReqEventBus,
    setReqEvent,
    setCors
};
