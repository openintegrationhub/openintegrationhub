const VirtualComponent = require('../../models/VirtualComponent');

module.exports = async function (req, res, next) {
    const { user } = req;

    let query;
    if (user.isAdmin) {
        query = {};
    } else {
        query = {
            $or: [
                {access: 'public'},
                {'owners.id': user.sub},
                {tenant: user.tenant}
            ]
        };
    }

    const versions = await VirtualComponent.find(query).lean().exec();

    res.data = versions;
    return next();
};
