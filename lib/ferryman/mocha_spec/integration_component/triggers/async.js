/* eslint no-unused-vars: 0 */ // --> OFF
/* eslint no-await-in-loop: 0 */ // --> OFF

async function process(msg, cfg, snapshot) {
    for (let i = 0; i < 11; i += 1) {
        console.log('Sending message %s', i);
        // eslint-disable-next-line no-invalid-this
        await this.emit('data', {
            id: 'f45be600-f770-11e6-b42d-b187bfbf19fd',
            headers: {
                'x-custom-component-header': '123_abc'
            },
            body: {
                id: 'someId',
                hai: 'there'
            }
        });
        console.log('Message %s was sent', i);
    }
    // eslint-disable-next-line no-invalid-this
    this.emit('end');
}

exports.process = process;
