/* eslint no-unused-vars: 0 */ // --> OFF

async function processAction(msg, cfg) {
  await this.emit('httpReply', {
    statusCode: 200,
    body: 'Ok',
    headers: {
      'content-type': 'text/plain',
    },
  });

  await this.emit('data', {
    body: {},
  });
  await this.emit('end');
}

exports.process = processAction;
