const bunyan = require('bunyan');
module.exports = bunyan.createLogger({
    name: '@openintegrationhub/scheduler',
    serializers: bunyan.stdSerializers
});
