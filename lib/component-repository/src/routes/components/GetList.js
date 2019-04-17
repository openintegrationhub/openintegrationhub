const Component = require('../../models/Component');

module.exports = async function (req, res, next) {
    const { user } = req;
    const { offset, limit } = req.paging;

    const [components, total] = await Promise.all([
        Component.find({'owners.id': user.sub}).skip(offset).limit(limit),
        Component.countDocuments({'owners.id': user.sub})
    ]);

    res.data = components;
    res.total = total;

    return next();
};
