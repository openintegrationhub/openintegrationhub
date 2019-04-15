const Component = require('../../models/Component');

module.exports = async function (req, res, next) {
    const { offset, limit } = req.paging;

    const [components, total] = await Promise.all([
        Component.find({}).skip(offset).limit(limit),
        Component.countDocuments({})
    ]);

    res.data = components;
    res.total = total;

    return next();
};
