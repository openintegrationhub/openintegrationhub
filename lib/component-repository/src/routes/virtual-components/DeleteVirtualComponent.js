const ComponentVersion = require('../../models/ComponentVersion');
const ComponentConfig = require('../../models/ComponentConfig');

module.exports = async function (req, res) {
  const { virtualComponent } = req;
  await virtualComponent.remove();

  const componentVersions = await ComponentVersion.find({
    virtualComponentId: virtualComponent._id,
  }).lean();

  if (componentVersions.length) {
    const componentVersionIds = componentVersions.map(({ _id }) => _id);

    const deletedManyVersion = await ComponentVersion.deleteMany({
      _id: {
        $in: componentVersionIds,
      },
    });

    const deletedManyConfig = await ComponentConfig.deleteMany({
      componentVersionId: {
        $in: componentVersionIds,
      },
    });

    req.logger.debug({
      deletedComponentVersions: deletedManyVersion.deletedCount,
      deletedComponentConfigs: deletedManyConfig.deletedCount,
    });
  }

  res.statusCode = 204;
  return res.end();
};
