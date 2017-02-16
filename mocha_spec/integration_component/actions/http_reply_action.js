const Q = require('q');
const request = require('request');

exports.process = processAction;

function processAction(msg, cfg) {

    this.emit('httpReply', {
        statusCode: 200,
        body: 'Ok',
        headers: {
            'content-type': 'text/plain'
        }
    });
    this.emit('end');

}
