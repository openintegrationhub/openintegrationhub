var EventEmitter = require('./emitter').EventEmitter;
var _ = require('lodash');
var util = require('util');
var selfAddressed = require('self-addressed');

exports.TaskExec = TaskExec;

function TaskExec() {
    EventEmitter.call(this);
    this.errorCount = 0;
}

util.inherits(TaskExec, EventEmitter);

TaskExec.prototype.process = function process(triggerOrAction, payload, cfg, snapshot) {
    //eslint-disable-next-line consistent-this
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

const _emit = TaskExec.prototype.emit;

TaskExec.emit = (name, data) => {
    function mailman(address, envelope) {
        _emit.call(address, name, envelope);
    }
    return selfAddressed(mailman, this, data); // returns a promise
};

const _on = TaskExec.prototype.on;

TaskExec.on = (name, fn) => {
    function onSelfAddressedEnvelope(envelope) {
        if (selfAddressed.is(envelope)) {
            var result = fn();
            selfAddressed(envelope, result);
            envelope.replies = 1;
            selfAddressed(envelope);
        }
    }
    _on.call(this, name, onSelfAddressedEnvelope);
};
