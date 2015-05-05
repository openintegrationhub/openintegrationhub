var info = require('debug')('info');
var debug = require('debug')('debug');
var events = require('events');
var _ = require('lodash');
var util = require('util');
var Q = require('q');

var TIMEOUT = process.env.TIMEOUT || 2000;

exports.TaskExec = TaskExec;

function TaskExec() {
    events.EventEmitter.call(this);

    this.dataCount = 0;
    this.errorCount = 0;
    this.errorz = [];
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
        taskexec.dataCount++;
        taskexec.emit('data', data);
    }

    scope.on('error', onError);
    function onError(err) {
        taskexec.errorCount++;
        taskexec.emit('error', err);
    }

    scope.on('rebound', onRebound);
    function onRebound(err) {
        taskexec.emit('rebound', err);
    }

    scope.on('end', onEnd);
    function onEnd() {
        clearTimeout(taskexec.executionTimeout);
        deferred.resolve();
        taskexec.emit('end');
    }

    try {
        if (typeof(triggerOrAction.process) === 'function') {
            triggerOrAction.process.apply(scope, [payload, cfg]);
        } else {
            throw new Error('Process function is not found');
        }
    } catch (err) {
        onError(err);
        onEnd();
    }

    return deferred.promise;
};
