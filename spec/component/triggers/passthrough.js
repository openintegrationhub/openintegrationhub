exports.process = function(msg, cfg){
    var that = this;
    that.emit('data', msg);
    that.emit('end');
};
