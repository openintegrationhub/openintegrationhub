function reportError(err){
    console.log('Error happened: %s', err.message);
    console.log(err.message);
}

exports.reportError = reportError;