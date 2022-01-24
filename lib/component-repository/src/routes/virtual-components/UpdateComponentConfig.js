const ComponentConfig = require('../../models/ComponentConfig');

module.exports = async function (req, res, next) {
  const { componentVersionId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  };

  const newConfig = req.body;

  res.data = await ComponentConfig.save(newConfig);
  return next();
};
