var logging = require('./lib/logging.js');
var Sailor = require('./lib/sailor.js').Sailor;
var settings = require('./lib/settings.js').readFrom(process.env);

var sailor = new Sailor(settings);

sailor.connect()
    .then(sailor.run.bind(sailor))
    .fail(logging.criticalError)
    .done();

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
    sailor.disconnect()
        .then(onSuccess)
        .catch(onError)
        .finally(exit)
        .done();

    function onSuccess() {
        console.log('Successfully disconnected');
    }

    function onError(err) {
        console.error('Unable to disconnect', err.stack);
    }

    function exit() {
        process.exit();
    }
}