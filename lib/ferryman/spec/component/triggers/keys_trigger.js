/* eslint no-unused-vars: 0 */ // --> OFF

function processTrigger(msg, cfg) {
  const that = this;
  that.emit('updateKeys', { oauth: { access_token: 'newAccessToken' } });
  that.emit('end');
}

exports.process = processTrigger;
