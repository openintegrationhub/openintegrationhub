exports.info = require('debug')('sailor:info');
exports.debug = require('debug')('sailor:debug');
exports.criticalError = criticalError;

function criticalError(err) {
    console.error('Error happened: %s', err.message);
    console.error(err.stack);
    process.exit(1);
}
