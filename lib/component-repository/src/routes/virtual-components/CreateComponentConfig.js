const ComponentConfig = require('../../models/ComponentConfig');
const mongoose = require('mongoose');

module.exports = async function (req, res, next) {
  const { authClientId } = req.body;
  const { _id } = req.virtualComponent;
  const virtualComponentId = _id;
  const tenant = req.user.isAdmin ? req.body.tenant : req.user.tenant;

  if (!mongoose.Types.ObjectId.isValid(virtualComponentId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }
  const currentVersionCompConfig = await ComponentConfig.findOne({
    virtualComponentId: virtualComponentId,
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
    virtualComponentId: virtualComponentId,
    tenant: tenant,
  });

  const savedConfig = await newConfig.save();
  res.send({ data: savedConfig });
  return next();
};
