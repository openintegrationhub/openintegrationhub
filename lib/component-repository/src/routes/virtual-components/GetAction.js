const mongoose = require('mongoose');
const ComponentVersion = require('../../models/ComponentVersion');

module.exports = async function (req, res, next) {
  const { componentVersionId, actionName } = req.params;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  };

  const componentVersion = await ComponentVersion.findOne(
    {
      _id: componentVersionId,
      'actions.name': actionName,
    },
    {
      'actions.$': 1,
    }
  ).lean();
  if (!componentVersion) {
    return res.status(404).send({
      errors: [
        { message: 'Component version could not be found!', code: 404 },
      ],
    });
  };
  if (!componentVersion || !componentVersion.actions[0]) {
    return res.status(404).send({
      errors: [{ message: 'Action with this name could not be found!', code: 404 }],
    });
  };

  req.logger.debug(componentVersion.actions[0]);
  res.data = componentVersion.actions[0];
  return next();
};
