/* eslint no-unused-vars: 0 */ // --> OFF

function processTrigger(msg, cfg) {
  const that = this;

  that.emit('error', new Error('Some component error'));
  that.emit('end');
}

exports.process = processTrigger;
