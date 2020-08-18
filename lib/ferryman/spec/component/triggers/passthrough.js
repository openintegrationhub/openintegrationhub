/* eslint no-unused-vars: 0 */ // --> OFF

function processTrigger(msg, cfg) {
  const that = this;
  that.emit('data', msg);
  that.emit('end');
}

exports.process = processTrigger;
