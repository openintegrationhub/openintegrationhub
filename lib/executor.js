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
    trycatch(function processActionOrTrigger() {
        if (_.isFunction(triggerOrAction.process)) {
            Promise.resolve()
                .then(function foo() {
                    return triggerOrAction.process.apply(self, [payload, cfg, snapshot]);
                })
                .then(onData)
                .catch(onError);
        } else {
            throw new Error('Process function is not found');
        }
    }, onError);

    function onData(data) {
        if (data) {
            console.log('Process function is a Promise/generator/etc', typeof data);
            console.log('EMITTING');
            console.log(data);
            self.emit('data', data);
            self.emit('end');
        }
    }

    function onError(err) {
        console.error(err.stack);
        self.emit('error', err);
        self.emit('end');
    }
};
