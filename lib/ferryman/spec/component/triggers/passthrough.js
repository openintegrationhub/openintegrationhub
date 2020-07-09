exports.process = processTrigger;

function processTrigger(msg, cfg) {
    var that = this;
    that.emit('data', msg);
    that.emit('end');
}
