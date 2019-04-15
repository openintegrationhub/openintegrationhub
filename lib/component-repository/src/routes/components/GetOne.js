const Component = require('../../models/Component');

module.exports = async function (req, res, next) {
    const component = await Component.findById(req.params.id);
    if (!component) {
        throw new Error('Not found'); //@todo: with error code
    }
    res.data = component;
    return next();
};
