const Component = require('../../models/Component');

module.exports = async function (req, res, next) {
    const { user } = req;
    const { offset, limit } = req.paging;

    let query;
    if (['ADMIN', 'SERVICE_ACCOUNT'].includes(user.role)) {
        query = {};
    } else {
        query = {
            $or: [
                {access: 'public'},
                {'owners.id': user.sub}
            ]
        };
    }

    const [components, total] = await Promise.all([
        Component.find(query).skip(offset).limit(limit),
        Component.countDocuments(query)
    ]);

    res.data = components;
    res.total = total;

    return next();
};
