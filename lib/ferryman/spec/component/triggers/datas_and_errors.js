/* eslint no-unused-vars: 0 */ // --> OFF

function processTrigger(msg, cfg) {
  const that = this;

  that.emit('data', { content: 'Data 1' });
  that.emit('error', new Error('Error 1'));
  that.emit('data', { content: 'Data 2' });
  that.emit('error', new Error('Error 2'));
  that.emit('data', { content: 'Data 3' });
  that.emit('end');
}

exports.process = processTrigger;
