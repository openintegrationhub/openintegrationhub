const ComponentConfig = require('../../models/ComponentConfig');
const mongoose = require('mongoose');

module.exports = async function (req, res, next) {
  const { authClientId } = req.body;
  const { componentVersionId } = req.params;
  const tenant = req.user.isAdmin ? req.body.tenant : req.user.tenant;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }
  const currentVersionCompConfig = await ComponentConfig.findOne({
    componentVersionId,
    tenant,
  });

  if (currentVersionCompConfig) {
    return res.status(400).send({
      errors: [
        { message: 'This component version has already been set.', code: 400 },
      ],
    });
  }

  const newConfig = new ComponentConfig({
    authClientId,
    componentVersionId,
    tenant
  });
  const errors = validate(newConfig);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  const savedConfig = await newConfig.save();
  res.statusCode = 201;
  res.send({ data: savedConfig });
  return next();
};
