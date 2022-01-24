const VirtualComponent = require('../../models/VirtualComponent');
const { validate } = require('../../utils/validator');

module.exports = async function (req, res, next) {
  const { body, user, virtualComponent } = req;
  const data = {
    ...body,
    ...virtualComponent
  };

  if (!data.owners.length) {
    data.owners.push({
      id: user.sub,
      type: 'user',
    });
  }

  const newVirtualComponent = new VirtualComponent(data);
  const errors = validate(newVirtualComponent);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  res.data = await newVirtualComponent.save(data);
  res.statusCode = 200;

  return next();
};
