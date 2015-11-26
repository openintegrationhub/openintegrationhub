var Q = require('q');
var logging = require('./lib/logging');
var service = require('./lib/service');
var debug = require('debug')('sailor');

var serviceMethod = process.argv[2];

debug('About to execute %s', serviceMethod);

service.processService(serviceMethod, process.env)
    .catch(logging.criticalError)
    .done();

process.on('uncaughtException', logging.criticalError);
