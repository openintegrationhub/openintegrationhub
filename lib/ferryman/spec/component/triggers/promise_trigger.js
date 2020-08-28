/* eslint no-unused-vars: 0 */ // --> OFF

function processTrigger(msg, cfg) {
  return Promise.resolve({
    body: 'I am a simple promise',
  });
}

exports.process = processTrigger;
