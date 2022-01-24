const ComponentVersion = require('../../models/ComponentVersion');

module.exports = async function (req, res, next) {
  const componentVersionId = req.params.componentVersionId;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  const componentVersionData = await ComponentVersion.findOne({
    _id: componentVersionId,
  }).lean();

  if (!componentVersionData) {
    return res
      .status(404)
      .send({
        errors: [
          { message: 'Component version could not be found', code: 404 },
        ],
      });
  }

  req.logger.debug(componentVersionData);
  res.data = componentVersionData;
  return next();
};
