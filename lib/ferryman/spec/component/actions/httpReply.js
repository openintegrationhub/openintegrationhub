exports.process = processAction;

async function processAction(msg, cfg) {
    await this.emit('httpReply', {
        statusCode: 200,
        body: 'Ok',
        headers: {
            'content-type': 'text/plain'
        }
    });

    await this.emit('data', {
        body: {}
    });
    await this.emit('end');
}
