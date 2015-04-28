exports.process = function(msg, cfg){
    var that = this;
    that.emit('rebound', new Error('Rebound reason'));
    that.emit('end');
};
