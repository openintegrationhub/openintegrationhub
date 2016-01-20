var logging = require('./lib/logging');
var service = require('./lib/service');
var debug = require('debug')('sailor');

var serviceMethod = process.argv[2];

debug('About to execute %s', serviceMethod);

service.processService(serviceMethod, process.env)
    .catch(logging.criticalError)
    .done(exit);

function exit() {
    process.exit(0);
}

process.on('uncaughtException', logging.criticalError);
