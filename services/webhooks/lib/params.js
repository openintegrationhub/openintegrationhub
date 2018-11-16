'use strict';

const commons = require('@elastic.io/commons');
const Task = commons.mongo.Task;
const rootLogger = require('@elastic.io/bunyan-logger');

/**
 * Decides whether request should be passed
 * @param {Task} task
 * @returns {Boolean}
 */
function requestShouldBePassed(task) {
    const isOrWillBeSuspended = task.status === Task.STATUS_SUSPENDED;

    const isSuspended = task.currentStatus === Task.CURRENT_STATUS_SUSPENDED;
    const isActive = task.currentStatus === Task.CURRENT_STATUS_ACTIVE;

    const isOrWillBeActiveAfterSuspended = task.status === Task.STATUS_ACTIVE && (isActive || isSuspended);

    return isOrWillBeSuspended || isOrWillBeActiveAfterSuspended;
}

async function taskIdParam(req, res, next, taskId) {
    try {
        rootLogger
            .child({
                taskId
            })
            .info('Retrieving task');

        const task = await Task.findByIdCached(taskId);

        if (task && requestShouldBePassed(task)) {
            req.task = task;
        }
        next();

    } catch (e) {
        return next(e);
    }
}

exports.taskIdParam = taskIdParam;
