exports.info = require('debug')('info');
exports.debug = require('debug')('debug');
exports.criticalError = criticalError;

function criticalError(err) {
    console.error('Error happened: %s', err.message);
    console.error(err.stack);
    process.exit(1);
}