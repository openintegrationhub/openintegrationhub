const Q = require('q');
const request = require('request');

exports.startup = startup;
exports.init = initTrigger;
exports.process = processTrigger;

const subscription = {};

function startup(cfg) {
    const options = {
        uri: 'http://localhost:8080/webhooks',
        json: true,
        body: {
            url: process.env.ELASTICIO_FLOW_WEBHOOK_URI
        }
    };

    return Q.ninvoke(request, 'post', options)
        .spread((req, body) => {
            return body;
        });
}

function initTrigger(cfg) {
    const options = {
        uri: 'https://api.acme.com/subscribe',
        json: true,
        body: {
            event: 'Opened'
        }
    };

    Q.ninvoke(request, 'post', options)
        .spread((req, body) => {
            subscription.id = body.id;
            subscription.cfg = cfg;
        });
}

function processTrigger(msg, cfg) {

    const that = this;
    const options = {
        uri: 'https://api.acme.com/customers',
        json: true
    };

    Q.ninvoke(request, 'get', options)
        .spread((req, body) => body)
        .then((data) => {
            that.emit('data', {
                id: 'f45be600-f770-11e6-b42d-b187bfbf19fd',
                body: {
                    originalMsg: msg,
                    customers: data,
                    subscription: subscription
                }
            });
            that.emit('end');
        });

}
