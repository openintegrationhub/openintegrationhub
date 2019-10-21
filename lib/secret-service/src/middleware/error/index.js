const defaultErrorHandler = (errObj, req, res, next) => { // eslint-disable-line
    const status = errObj.status || 500;
    let message = 'Error';
    if (errObj.err) {
        if (errObj.err.message) {
            message = errObj.err.message;
        } else {
            message = errObj.err;
        }
    }
    res.status(status);
    res.send({
        message,
    });
};

module.exports = {
    default: defaultErrorHandler,
};
