const ComponentVersion = require('../../models/ComponentVersion');
const Component = require('../../models/Component');
const { validate } = require('../../utils/validator');
const { buildFunctionList } = require('../../utils/parserFunctions');

module.exports = async function (req, res, next) {
  const { body, virtualComponent } = req;
  const data = body;

  if (data._id) {
    delete data._id;
  }

  data.virtualComponentId = virtualComponent._id;

  if (data.triggers && !Array.isArray(data.triggers)) {
    data.triggers = buildFunctionList(data.triggers);
  }
  if (data.actions && !Array.isArray(data.actions)) {
    data.actions = buildFunctionList(data.actions);
  }

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
      .status(404)
      .send({ errors: { mesage: 'Component not found', code: 404 } });
  }

  res.data = await ComponentVersion.create(data);
  res.statusCode = 201;

  return next();
};
