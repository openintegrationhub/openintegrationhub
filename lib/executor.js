var EventEmitter = require('events').EventEmitter;
var trycatch = require('trycatch');
var _ = require('lodash');
var util = require('util');

exports.TaskExec = TaskExec;

function TaskExec() {
    EventEmitter.call(this);
    this.errorCount = 0;
}

util.inherits(TaskExec, EventEmitter);

TaskExec.prototype.process = function process(triggerOrAction, payload, cfg, snapshot) {
    var self = this;
    trycatch(function() {
        if (_.isFunction(triggerOrAction.process)) {
            triggerOrAction.process.apply(self, [payload, cfg, snapshot]);
        } else {
            throw new Error('Process function is not found');
        }
    }, function(err) {
        self.emit('error', err);
        self.emit('end');
    });
};