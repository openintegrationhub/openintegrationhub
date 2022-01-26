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
    componentVersionId: componentVersionId,
    tenant: tenant,
  });

  if (currentVersionCompConfig) {
    return res.status(400).send({
      errors: [
        { message: 'This component version has already been set.', code: 400 },
      ],
    });
  }

  const newConfig = new ComponentConfig({
    authClientId: authClientId,
    componentVersionId: componentVersionId,
    tenant: tenant,
  });

  const savedConfig = await newConfig.save();
  res.send({ data: savedConfig });
  return next();
};
