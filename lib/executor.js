var logging = require('./logging.js');
var info = logging.info;

var events = require('events');
var trycatch = require('trycatch');
var _ = require('lodash');
var util = require('util');
var Q = require('q');

var TIMEOUT = process.env.TIMEOUT || 2000;

exports.TaskExec = TaskExec;

function TaskExec(headers, step) {
    events.EventEmitter.call(this);

    this.taskStat = {
        execId: undefined, // @TODO where will we get it?
        taskId: headers.taskId, // from message header
        user: undefined,// @TODO where will we get it?
        app: undefined,
        partner: undefined,
        stepId: headers.stepId, // from message header
        compId: step.compId, // from step info
        'function': step.function, // from step info
        start : new Date(), // current date
        end : undefined,
        memory: undefined,
        dataCount: 0,
        errorCount: 0,
        rebounded: false,
        reboundReason: undefined,
        errorInput: undefined,
        errorz: [],
        heartbeats: 0,
        logFile: String,
        syncAppId: undefined
    };
}

util.inherits(TaskExec, events.EventEmitter);

TaskExec.prototype.process = function process(triggerOrAction, payload, cfg) {

    var taskexec = this;
    var deferred = Q.defer();

    taskexec.executionTimeout = setTimeout(finishOnTimeout, TIMEOUT);

    function finishOnTimeout() {
        info('Message execution stopped because of timeout');
        onEnd();
    }

    // to catch events emitted by client
    var scope = new events.EventEmitter();

    scope.on('data', onData);
    function onData(data) {
        taskexec.taskStat.dataCount++;
        taskexec.emit('data', data);
    }

    scope.on('error', onError);
    function onError(err) {

        taskexec.taskStat.errorCount++;
        taskexec.taskStat.errorInput = payload;
        taskexec.taskStat.errorz.push({
            message: err.message,
            stack: err.stack,
            name: err.name
        });

        taskexec.emit('error', err);
    }

    scope.on('rebound', onRebound);
    function onRebound(err) {
        taskexec.taskStat.rebounded = true;
        taskexec.taskStat.reboundReason = err;
        taskexec.emit('rebound', err);
    }

    scope.on('end', onEnd);
    function onEnd() {
        taskexec.taskStat.end = new Date();

        clearTimeout(taskexec.executionTimeout);
        deferred.resolve();
        taskexec.emit('end');
    }

    trycatch(function() {
        if (typeof(triggerOrAction.process) === 'function') {
            triggerOrAction.process.apply(scope, [payload, cfg]);
        } else {
            throw new Error('Process function is not found');
        }
    }, function(err) {
        onError(err);
        onEnd();
    });

    return deferred.promise;
};
