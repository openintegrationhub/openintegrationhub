const ComponentVersion = require('../../models/ComponentVersion');
const Component = require('../../models/Component');
const { validate } = require('../../utils/validator');

module.exports = async function (req, res, next) {
  const { body, virtualComponent } = req;
  console.log(virtualComponent)
  const data = body;

  if (data._id) {
    delete data._id;
  }

  data.virtualComponentId = virtualComponent._id;

  const componentVersion = new ComponentVersion(data);
  const errors = validate(componentVersion);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  const component = await Component.count({
    _id: componentVersion.componentId,
  });
  if (!component) {
    return res
      .status(400)
      .send({ errors: { mesage: 'Component not found', code: 400 } });
  }

  res.data = await ComponentVersion.create(data);
  res.statusCode = 201;

  return next();
};
