exports.process = processTrigger;

function processTrigger(msg, cfg) {
    var that = this;

    that.emit('error', new Error('Some component error'));
    that.emit('end');
}
