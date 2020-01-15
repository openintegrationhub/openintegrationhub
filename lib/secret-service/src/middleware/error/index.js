const defaultErrorHandler = (err, req, res, next) => { // eslint-disable-line
    const status = err.status || 500;
    const message = err.message || '';
    res.status(status);
    res.send({
        message,
    });
};

module.exports = {
    default: defaultErrorHandler,
};
