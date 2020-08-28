/* eslint no-unused-vars: 0 */ // --> OFF

function processTrigger(msg, cfg) {
  this.emit('data', { body: this.getFlowVariables() });
  this.emit('end');
}

exports.process = processTrigger;
