const mongoose = require('mongoose');
const ComponentVersion = require('../../models/ComponentVersion');

module.exports = async function (req, res, next) {
  const { componentVersionId, triggerName } = req.params;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  const trigger = await ComponentVersion.findOne(
    {
      _id: componentVersionId,
      'triggers.name': triggerName,
    },
    {
      'triggers.$': 1,
    }
  ).lean();

  if (!trigger) {
    return res.status(404).send({
      errors: [
        { message: 'Trigger with this name could not be found!', code: 404 },
      ],
    });
  }

  req.logger.debug(trigger);
  res.data = trigger;
  return next();
};
