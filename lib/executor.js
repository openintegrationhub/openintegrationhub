var debug = require('debug')('sailor');
var events = require("events");
var _ = require("lodash");
var util = require("util");

var TaskExec = function() {
    events.EventEmitter.call(this);

    this.dataCount = 0;
    this.errorCount = 0;
    this.errorz = [];
};

util.inherits(TaskExec, events.EventEmitter);

TaskExec.prototype.process = function process(triggerOrAction, message, cfg) {

    var self = this;
    debug('Process message');

    // to catch events emitted by client
    var scope = new events.EventEmitter();

    scope.on('data', self.processData);
    scope.on('error', self.processError);
    scope.on('rebound', self.onRebound);
    scope.on('end', self.onEnd);

    try {
        triggerOrAction.process.apply(scope, [message, cfg]);
    } catch (err) {
        debug(err);
        self.processError(err);
        self.onEnd();
    }
};

TaskExec.prototype.processData = function processData(data){
    debug('Increase data count');
    debug(this.onData);
    this.dataCount++;
    this.onData(data);
};


TaskExec.prototype.processError = function processError(err){
    debug('Increase error count');
    this.errorCount++;
    this.onError(err);
};



exports.TaskExec = TaskExec;
