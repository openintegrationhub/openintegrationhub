exports.process = handleMessage;

function handleMessage(msg, cfg, snapshot) {
    console.log('echo_incoming_data');
    //eslint-disable-next-line no-invalid-this
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
