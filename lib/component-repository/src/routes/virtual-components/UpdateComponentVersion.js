const ComponentVersion = require('../../models/ComponentVersion');
const { validate } = require('../../utils/validator');
const { buildFunctionList } = require("../../utils/parserFunctions");

module.exports = async function (req, res, next) {
  const { body } = req;
  const { componentVersionId } = req.params;

  const componentVersion = await ComponentVersion.findOne({
    _id: componentVersionId,
  });

  if (!componentVersion) {
    const error = new Error('ComponentVersion is not found');
    error.statusCode = 404;
    throw error;
  }

  const data = {
    ...componentVersion._doc,
    ...body,
  };

  if (data.triggers && !Array.isArray(data.triggers)) {
    data.triggers = buildFunctionList(data.triggers);
  }
  if (data.actions && !Array.isArray(data.actions)) {
    data.actions = buildFunctionList(data.actions);
  }

  const newComponentVersion = new ComponentVersion(data);
  const errors = validate(newComponentVersion);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  Object.assign(componentVersion, data);
  res.data = await componentVersion.save();
  res.statusCode = 200;

  return next();
};
