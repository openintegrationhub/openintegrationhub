const ComponentConfig = require('../../models/ComponentConfig');
const mongoose = require('mongoose');
module.exports = async function (req, res, next) {
  const { authClientId } = req.body;
  const { _id } = req.virtualComponent;
  const virtualComponentId = _id;
  const oldTenant = req.user.isAdmin ? req.body.tenant : req.user.tenant;
  if (!mongoose.Types.ObjectId.isValid(virtualComponentId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  const qry = { virtualComponentId: virtualComponentId, tenant: oldTenant };
  const currentVersionCompConfig = await ComponentConfig.findOne(qry).lean();

  if (!currentVersionCompConfig) {
    return res.status(404).send({
      errors: [
        { message: 'This component version has not been found.', code: 404 },
      ],
    });
  }

  const newConfig = await ComponentConfig.findByIdAndUpdate(
    { _id: currentVersionCompConfig._id },
    { authClientId: authClientId }
  ).lean();

  res.data = newConfig;
  res.statusCode = 200;

  return next();
};
