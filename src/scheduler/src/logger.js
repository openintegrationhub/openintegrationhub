const bunyan = require('bunyan');
/**
 * Default bunyan logger.
 * @type {Logger}
 */
module.exports = bunyan.createLogger({
    name: '@openintegrationhub/scheduler',
    serializers: bunyan.stdSerializers
});
