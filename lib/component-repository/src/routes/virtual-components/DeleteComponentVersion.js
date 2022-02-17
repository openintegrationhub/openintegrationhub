const ComponentVersion = require('../../models/ComponentVersion');
const mongoose = require('mongoose');
const VirtualComponent = require('../../models/VirtualComponent');
const ComponentConfig = require('../../models/ComponentConfig');
const { ObjectId } = mongoose.Types;

const areTheSameObjectIds = (a, b) => {
  return a.equals(b);
};

module.exports = async function (req, res, next) {
  const componentVersionId = req.params.componentVersionId;
  const { virtualComponent } = req;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res.status(400).send({
      errors: [{ message: 'Invalid component version id', code: 400 }],
    });
  }

  if (
    !areTheSameObjectIds(
      new ObjectId(componentVersionId),
      virtualComponent.defaultVersionId
    )
  ) {
    await ComponentVersion.deleteOne({ componentVersionId });

    const newVersions = virtualComponent.versions.filter(
      (nV) => !areTheSameObjectIds(nV.id, componentVersionId)
    );
    await VirtualComponent.findOneAndUpdate(
      { _id: virtualComponent._id },
      {
        versions: newVersions,
      }
    ).lean();
    await ComponentConfig.deleteMany({ componentVersionId });
    res.statusCode = 204;
  } else {
    return res.status(400).send({
      errors: [
        { message: 'Cannot delete the default component Version', code: 400 },
      ],
    });
  }
  return next();
};
