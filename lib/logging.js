exports.info = info;
exports.debug = debug;
exports.criticalError = criticalError;

function info() {
    console.log.apply(null, arguments);
}

function debug() {
    console.log.apply(null, arguments);
}

function criticalError(err) {
    console.log('Error happened: %s', err.message);
    console.log(err.message);
    process.exit(1);
}