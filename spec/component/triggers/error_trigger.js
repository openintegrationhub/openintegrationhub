exports.process = function(msg, cfg){
    var that = this;

    that.emit('error', new Error('Some component error'));
    that.emit('end');
};
