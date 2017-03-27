'use strict';

exports.process = process;

function process(msg, cfg, snapshot) {
    this.emit('data', {'id': 'someId', 'hai': 'there'});
}
