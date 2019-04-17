const Component = require('../../models/Component');

module.exports = async function (req, res, next) {
    const { component } = req;
    res.data = component;
    return next();
};
