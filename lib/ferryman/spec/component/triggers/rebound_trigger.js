/* eslint no-unused-vars: 0 */ // --> OFF

function processTrigger(msg, cfg) {
  const that = this;
  that.emit('rebound', new Error('Rebound reason'));
  that.emit('end');
}

exports.process = processTrigger;
