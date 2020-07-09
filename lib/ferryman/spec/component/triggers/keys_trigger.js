exports.process = processTrigger;

function processTrigger(msg, cfg) {
    var that = this;
    that.emit('updateKeys', { oauth: { access_token: 'newAccessToken' } });
    that.emit('end');
}
