module.exports = async function (req, res, next) {
    const { component } = req;
    const { data } = req.body;
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    Object.assign(component, data);
    await component.save();

    res.data = component;
    return next();
};
