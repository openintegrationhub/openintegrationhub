// 'info' should be enabled always
if (!process.env.DEBUG) {
    process.env.DEBUG = 'info';
} else {
    process.env.DEBUG += ',info';
}

var logging = require('./lib/logging.js');
var Sailor = require('./lib/sailor.js').Sailor;
var settings = require('./lib/settings.js').readFrom(process.env);

var sailor = new Sailor(settings);

sailor.connect()
    .then(sailor.run.bind(sailor))
    .fail(logging.criticalError)
    .done();

process.on('SIGTERM', function() {
    sailor.disconnect();
});

process.on('uncaughtException', logging.criticalError);



