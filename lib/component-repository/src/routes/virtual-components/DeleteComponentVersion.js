const ComponentVersion = require('../../models/ComponentVersion');
const mongoose = require('mongoose');
const VirtualComponent = require('../../models/VirtualComponent');
const ComponentConfig = require('../../models/ComponentConfig');
const { ObjectId } = mongoose.Types;

module.exports = async function (req, res, next) {
  const componentVersionId = req.params.componentVersionId;
  const { virtualComponent } = req;

  if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }
  const areTheSameId = (a, b) => {
    return ObjectId(a).toString() === ObjectId(b).toString();
  };
  if (!areTheSameId(componentVersionId, virtualComponent.defaultVersionId)) {
    await ComponentVersion.findByIdAndDelete(
      componentVersionId
    ).lean();

    const newVersions = virtualComponent.versions.filter(
      (nV) => !areTheSameId(nV.id, componentVersionId)
    );
    await VirtualComponent.findOneAndUpdate(
      { _id: virtualComponent._id },
      {
        versions: newVersions,
      }
    ).exec();
    await ComponentConfig.deleteMany({ componentVersionId }).exec();
    res.statusCode = 204
    
  } else {
    return res.status(400).send({
      errors: [
        { message: 'Cannot delete the default component Version', code: 400 },
      ],
    });
  }
  return next();
};
