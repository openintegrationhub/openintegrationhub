const VirtualComponent = require('../../models/VirtualComponent');
const { validate } = require('../../utils/validator');

module.exports = async function (req, res, next) {
  const { body, user, virtualComponent } = req;
  const data = {
    ...virtualComponent._doc,
    ...body,
  };

  if (data.owners && !data.owners.length) {
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
  Object.assign(virtualComponent, data);
  res.data = await virtualComponent.save();
  res.statusCode = 200;

  return next();
};
