const ComponentConfig = require('../../models/ComponentConfig');

module.exports = async function (req, res, next) {
  const { authClientId } = req.body;
  const { componentVersionId } = req.params;
  const tenant = req.user.isAdmin ? req.body.tenant : req.user.tenant;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  };

  const qry = { _id: componentVersionId, tenant: tenant };
  const currentVersionCompConfig = await ComponentConfig.findOne(qry);

  if (currentVersionCompConfig) {
    ComponentConfig.findOneAndUpdate(
      qry,
      { authClientId: authClientId },
      {
        upsert: false,
        new: true,
      }
    ).lean();
  } else {
    return res.status(404).send({
      errors: [
        { message: 'This component version has not been found.', code: 404 },
      ],
    });
  };

  return next();
};
