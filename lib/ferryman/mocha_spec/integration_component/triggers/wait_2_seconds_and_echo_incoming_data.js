exports.process = handleMessage;

async function handleMessage(msg, cfg, snapshot) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    //eslint-disable-next-line no-invalid-this
    await this.emit('data', {
        id: 'f45be600-f770-11e6-b42d-b187bfbf1ccc',
        headers: {
            'x-custom-component-header': 'wait_2_seconds_and_echo_incoming_data'
        },
        body: {
            msg,
            cfg,
            snapshot
        }
    });
    this.emit('end');
}
