exports.process = processTrigger;

function processTrigger(msg, cfg) {
    var that = this;
    that.emit('error', new Error('Some error occurred!'));
    that.emit('end');
    that.emit('end');
}
