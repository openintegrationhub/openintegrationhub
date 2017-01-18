const logging = require('./lib/logging.js');
const Sailor = require('./lib/sailor.js').Sailor;
const co = require('co');

let sailor;

co(function* putOutToSea() {
    const settings = require('./lib/settings.js').readFrom(process.env);
    sailor = new Sailor(settings);
    yield sailor.prepare();
    if (settings.INVOKE === 'onFlowStart') {
        yield sailor.onFlowStart();
        return;
    }
    yield sailor.connect();
    yield sailor.init();
    yield sailor.run();
}).catch(logging.criticalError);

process.on('SIGTERM', function onSigterm() {
    console.log('Received SIGTERM');
    disconnect();
});

process.on('SIGINT', function onSigint() {
    console.log('Received SIGINT');
    disconnect();
});

process.on('uncaughtException', logging.criticalError);

function disconnect() {
    co(function* putIn() {
        yield sailor.disconnect();
        console.log('Successfully disconnected');
        process.exit();
    }).catch((err) => {
        console.error('Unable to disconnect', err.stack);
        process.exit(-1);
    });
}