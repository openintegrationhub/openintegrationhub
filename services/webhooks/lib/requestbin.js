'use strict';

const Q = require('q');
const commons = require('@elastic.io/commons');
const rootLogger = require('@elastic.io/bunyan-logger');
const RequestBin = commons.mongo.RequestBin;


function createRequestBin(req) {
    let requestId = req.id;
    let task = req.task;

    if (!task) {
        return Q();
    }

    let taskId = task._id;

    rootLogger
        .taskLogger({
            taskId
        })
        .info(`About to persist RequestBin for taskId=${taskId},requestId=${requestId}`);

    function create() {
        return RequestBin.createFromRequest(taskId, req);
    }

    return Q().then(create);
}

function persistRequestBin(bin) {

    if (!bin) {
        return Q();
    }
    rootLogger
        .taskLogger({
            taskId: bin.taskId
        })
        .info(`Persisting RequestBin for taskId=${bin.taskId},requestId=${bin.requestId}`);

    return Q.ninvoke(bin, 'save');
}

function requestBin(req) {

    function onError(err) {
        rootLogger.error(err);
    }

    return createRequestBin(req)
        .then(persistRequestBin)
        .fail(onError);
}

function requestBinSuccess(req, res, next) {
    requestBin(req);
    next();
}

function requestBinErrors(err, req, res, next) {
    req.rawBody = err.body;

    requestBin(req);
    next(err);
}

exports.requestBinSuccess = requestBinSuccess;
exports.requestBinErrors = requestBinErrors;
