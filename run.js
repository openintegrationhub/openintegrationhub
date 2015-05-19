var logging = require('./lib/logging.js');
var Sailor = require('./lib/sailor.js').Sailor;
var settings = require('./lib/settings.js').readFrom(process.env);


sailor = new Sailor(settings);

sailor.connect()
    .then(sailor.run.bind(sailor))
    .fail(logging.criticalError)
    .done();

process.on('SIGTERM', function() {
    sailor.disconnect();
});

process.on('uncaughtException', function(err) {
    console.log('Uncaught exception: ' + err.message);
    console.log(err.stack);
});



