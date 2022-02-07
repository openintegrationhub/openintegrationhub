const Component = require('../../models/Component');

module.exports = async function (req, res, next) {
    const { body, user } = req;
    const data = body;
    delete data._id;

    data.owners = data.owners || [];
    const currentUserAsOwner = data.owners.find(o => o.type === 'user' && o.id === user.sub);

    if (!currentUserAsOwner) {
        data.owners.push({
            id: user.sub,
            type: 'user'
        });
    }

    data.tenant = user.tenant;

    res.data = await Component.create(data);
    res.statusCode = 201;

    return next();
};
