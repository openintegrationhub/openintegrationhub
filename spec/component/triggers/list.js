exports.process = function(msg, cfg){
    var that = this;
    var data = msg;

    that.emit('data', msg);
    that.emit('end');
};
