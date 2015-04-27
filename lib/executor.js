var debug = require('debug')('sailor');
var events = require("events");
var _ = require("lodash");
var util = require("util");
var Q = require("q");

var TaskExec = function() {
    events.EventEmitter.call(this);

    this.dataCount = 0;
    this.errorCount = 0;
    this.errorz = [];
};

util.inherits(TaskExec, events.EventEmitter);

TaskExec.prototype.process = function process(triggerOrAction, message, cfg) {

    var self = this;
    var deferred = Q.defer();

    // to catch events emitted by client
    var scope = new events.EventEmitter();

    scope.on('data', onData);
    function onData(data){
        self.dataCount++;
        self.onData(data);
    }

    scope.on('error', onError);
    function onError(err){
        self.errorCount++;
        self.onError(err);
    }

    scope.on('rebound', onRebound);
    function onRebound(err){
        self.onRebound(err);
    }

    scope.on('end', onEnd);
    function onEnd(){
        self.onEnd();
        deferred.resolve();
    }

    try {
        triggerOrAction.process.apply(scope, [message, cfg]);
    } catch (err) {
        onError(err);
        onEnd();
    }

    return deferred.promise;
};

exports.TaskExec = TaskExec;
