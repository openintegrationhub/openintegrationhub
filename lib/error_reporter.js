exports.reportError = reportError;

function reportError(err) {
    console.log('Error happened: %s', err.message);
    console.log(err.message);
}