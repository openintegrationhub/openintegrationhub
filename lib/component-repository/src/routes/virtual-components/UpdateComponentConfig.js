const ComponentConfig = require('../../models/ComponentConfig');
const mongoose = require('mongoose');
module.exports = async function (req, res, next) {
  const { authClientId } = req.body;
  const { componentVersionId } = req.params;
  const oldTenant = req.user.isAdmin ? req.body.tenant : req.user.tenant;
  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  const qry = { componentVersionId: componentVersionId, tenant: oldTenant };
  const currentVersionComponentConfig = await ComponentConfig.findOne(qry).lean();

  if (!currentVersionComponentConfig) {
    return res.status(404).send({
      errors: [
        { message: 'This component version has not been found.', code: 404 },
      ],
    });
  }

  const newConfig = await ComponentConfig.findByIdAndUpdate(
    { _id: currentVersionComponentConfig._id },
    { authClientId: authClientId }
  ).lean();

  res.data = newConfig;
  res.statusCode = 200;

  return next();
};
