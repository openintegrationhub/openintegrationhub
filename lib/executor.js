const _ = require('lodash');
const util = require('util');
const selfAddressed = require('self-addressed');
const EventEmitter = require('./emitter').EventEmitter;
const log = require('./logging');
const { ComponentLogger } = log;

exports.TaskExec = TaskExec;

function TaskExec({ loggerOptions, variables } = {}) {
    EventEmitter.call(this);
    this.errorCount = 0;
    this.logger = new ComponentLogger(loggerOptions);
    // copy variables to protect from outside changes;
    this._variables = Object.assign({}, variables || {});
}

util.inherits(TaskExec, EventEmitter);

TaskExec.prototype.process = function process(triggerOrAction, payload, cfg, snapshot) {
    //eslint-disable-next-line consistent-this
    const self = this;

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
            log.debug('Process function is a Promise/generator/etc');
            self.emit('data', data);
        }
        self.emit('end');
    }

    function onError(err) {
        log.error(err);
        self.emit('error', err);
        self.emit('end');
    }
};

/**
 * Returns flow variables or empty object
 * @returns {Object<String, String>}
 */
TaskExec.prototype.getFlowVariables = function getFlowVariables() {
    return this._variables;
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
