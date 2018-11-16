'use strict';
const logger = require('@elastic.io/bunyan-logger');


function createTaskLogger(taskInfo) {
    return logger.taskLogger(taskInfo);
}

function reqSerializer(req) {

    if (!req || !req.connection) {
        return req;
    }

    let result = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.connection.remoteAddress,
        remotePort: req.connection.remotePort,
        body: req.body,
        query: req.query
    };

    return result;
}

function createDefaultLogger(taskId) {
    let log = logger.taskLogger({
        taskId
    });
    log.addSerializers({
        req: reqSerializer
    });

    return log;
}


exports.createDefaultLogger = createDefaultLogger;
exports.createTaskLogger = createTaskLogger;
