exports.init = initTrigger;
exports.process = processTrigger;

function initTrigger(cfg) {
    return Promise.resolve({
        subscriptionId: '_subscription_123'
    });
}

function processTrigger(msg, cfg) {
    var that = this;
    that.emit('data', {
        body: {}
    });
    that.emit('end');
}
