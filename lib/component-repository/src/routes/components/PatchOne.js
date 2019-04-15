const Component = require('../../models/Component');

module.exports = async function (req, res, next) {
    const component = await Component.findById(req.params.id);
    if (!component) {
        throw new Error('Not found'); //@todo: error type
    }
    const { data } = req.body;
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    Object.assign(component, data);
    await component.save();

    res.data = component;
    return next();
};
