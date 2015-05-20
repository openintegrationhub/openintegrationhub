exports.info = require('debug')('info');
exports.debug = require('debug')('debug');
exports.criticalError = criticalError;

function criticalError(err) {
    console.log('Error happened: %s', err.message);
    console.log(err.message);
    process.exit(1);
}