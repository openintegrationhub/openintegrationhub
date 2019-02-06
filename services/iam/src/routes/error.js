const pug = require('pug');
const path = require('path');
const ERROR_MESSAGES = require('../constants/error-messages');

const defaultErrorHandlder = (err, req, res, next) => {
    const status = err.status || 500;
    let message = err.message || '';

    const contype = req.headers['content-type'];

    if (contype !== 'application/x-www-form-urlencoded') {
        return res
            .status(status)
            .send({ message });
    } 
    if (err.message) {
        message = ERROR_MESSAGES[err.message] || 'UNKNOWN_ERROR';
    }
    
    return res
        .status(status)
        .send(
            pug.renderFile(
                path.join(__dirname, '../views/error.pug'), {
                    message,
                    status,
                },
            ),
        );

};

module.exports = {
    'default': defaultErrorHandlder,
};
   
