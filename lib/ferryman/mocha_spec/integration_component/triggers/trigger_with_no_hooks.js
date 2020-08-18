/* eslint no-unused-vars: 0 */ // --> OFF
const rp = require('request-promise-native');

function processTrigger(msg, cfg) {
    // eslint-disable-next-line no-invalid-this
    const that = this;
    const options = {
        uri: 'https://api.acme.com/customers',
        json: true
    };

    rp.get(options).then((data) => {
        that.emit('data', {
            id: 'f45be600-f770-11e6-b42d-b187bfbf19fd',
            body: {
                originalMsg: msg,
                customers: data
            }
        });
        that.emit('end');
    });
}

exports.process = processTrigger;
