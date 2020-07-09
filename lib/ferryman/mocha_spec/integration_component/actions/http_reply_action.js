'use strict';

exports.process = processAction;

function processAction(msg, cfg) {

    //eslint-disable-next-line no-invalid-this
    this.emit('httpReply', {
        statusCode: 200,
        body: 'Ok',
        headers: {
            'content-type': 'text/plain'
        }
    });
    //eslint-disable-next-line no-invalid-this
    this.emit('end');

}
