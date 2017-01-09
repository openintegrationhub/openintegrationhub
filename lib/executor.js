var EventEmitter = require('events').EventEmitter;
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
    if (!_.isFunction(triggerOrAction.process)) {
        return onError(new Error('Process function is not found'));
    }
    new Promise((resolve, reject) => {
        const result = triggerOrAction.process.bind(self)(payload, cfg, snapshot);
        if (result) {
            resolve(result);
        }
    })
        .then(onPromisedData)
        .catch(onError);

    function onPromisedData(data) {
        if (data) {
            console.log('Process function is a Promise/generator/etc');
            self.emit('data', data);
        }
        self.emit('end');
    }

    function onError(err) {
        console.error(err.stack);
        self.emit('error', err);
        self.emit('end');
    }
};
