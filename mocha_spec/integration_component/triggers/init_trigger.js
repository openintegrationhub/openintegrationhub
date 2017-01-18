const Q = require('q');
const request = require('request');

exports.onFlowStart = onFlowStart;
exports.init = initTrigger;
exports.process = processTrigger;

const stepStones = {};

function onFlowStart(cfg) {
    const options = {
        uri: 'http://localhost:8080/webhooks',
        json: true,
        body: {
            url: 'https://in.elastic.io/hooks/' + process.env.ELASTICIO_TASK_ID
        }
    };

    Q.ninvoke(request, 'post', options)
        .spread((req, body) => {
            console.log(body);
        });
}

function initTrigger(cfg) {
    stepStones.init = {
        cfg
    };
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
                body: {
                    originalMsg: msg,
                    customers: data,
                    stepStones: stepStones
                }
            });
            that.emit('end');
        });

}
