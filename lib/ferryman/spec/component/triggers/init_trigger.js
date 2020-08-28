/* eslint no-unused-vars: 0 */ // --> OFF

function initTrigger(cfg) {
  return Promise.resolve({
    subscriptionId: '_subscription_123',
  });
}

function processTrigger(msg, cfg) {
  const that = this;
  that.emit('data', {
    body: {},
  });
  that.emit('end');
}

exports.init = initTrigger;
exports.process = processTrigger;
