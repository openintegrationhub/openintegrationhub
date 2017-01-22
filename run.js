const logging = require('./lib/logging.js');
const Sailor = require('./lib/sailor.js').Sailor;
const settings = require('./lib/settings.js').readFrom(process.env);
const co = require('co');

let sailor;

co(function* putOutToSea() {
    sailor = new Sailor(settings);
    yield sailor.prepare();
    if (!!settings.STARTUP_REQUIRED) {
        yield sailor.startup();
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
        yield sailor.shutdown();
        process.exit();
    }).catch((err) => {
        console.error('Unable to disconnect', err.stack);
        process.exit(-1);
    });
}