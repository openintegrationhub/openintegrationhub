const VirtualComponent = require('../../models/VirtualComponent');
const { validate } = require('../../utils/validator');

module.exports = async function (req, res, next) {
  const { body, user } = req;
  const data = body;

  if (data._id) {
    delete data._id;
  }

  data.owners = user.isAdmin
    ? data.owners
    : [
        {
          id: user.sub,
          type: 'user',
        },
      ];

  if (user.isAdmin && body.tenant) {
    data.tenant = body.tenant;
  } else {
    data.tenant = user.tenant;
  }

  const virtualComponent = new VirtualComponent(data);
  const errors = validate(virtualComponent);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  res.data = await VirtualComponent.create(data);
  res.statusCode = 201;

  return next();
};
