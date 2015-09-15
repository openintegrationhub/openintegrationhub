var Q = require('q');
var logging = require('./lib/logging');
var service = require('./lib/service');

var serviceMethod = process.argv[2];

service.processService(serviceMethod, process.env)
    .catch(logging.criticalError)
    .done();

process.on('uncaughtException', logging.criticalError);
