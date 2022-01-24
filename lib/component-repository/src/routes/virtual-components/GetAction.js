module.exports = async function (req, res, next) {
  const { componentVersionId, actionName } = req.params;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  };

  const action = await ComponentVersion.findOne(
    {
      _id: componentVersionId,
      'actions.name': actionName,
    },
    {
      'actions.$': 1,
    }
  ).lean();

  if (!action) {
    return res.status(404).send({
      errors: [{ message: 'Action with this name could not be found!', code: 404 }],
    });
  };

  req.logger.debug(action);
  res.data = action;
  return next();
};
