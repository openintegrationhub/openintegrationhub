const defaultErrorHandler = (errObj, req, res, next) => { // eslint-disable-line
    const status = errObj.status;
    const message = errObj.err || 'Error';
    res.status(status);
    res.send({
        message,
    });
};

module.exports = {
    default: defaultErrorHandler,
};
