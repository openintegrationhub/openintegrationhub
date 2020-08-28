/* eslint no-unused-vars: 0 */ // --> OFF

function handleMessage(msg, cfg, snapshot) {
    // eslint-disable-next-line no-invalid-this
    this.emit('data', {
        id: 'f45be600-f770-11e6-b42d-b187bfbf1bbb',
        headers: {
            'x-custom-component-header': '123_abc'
        },
        body: {
            msg,
            cfg,
            snapshot
        }
    });
    this.emit('end');
}

exports.process = handleMessage;
