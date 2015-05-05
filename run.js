var Sailor = require('./lib/sailor.js').Sailor;
var settings = require('./lib/settings.js').readFrom(process.env);
var errorReporter = require('./lib/error_reporter.js');

sailor = new Sailor(settings);

sailor.connect()
    .then(sailor.run.bind(sailor))
    .fail(errorReporter.reportError)
    .done();

process.on('SIGTERM', function() {
    sailor.disconnect();
});




