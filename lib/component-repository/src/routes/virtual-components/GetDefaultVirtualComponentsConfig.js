const VirtualComponent = require('../../models/VirtualComponent');
const ComponentConfig = require('../../models/ComponentConfig');

module.exports = async function (req, res, next) {
  const { user } = req;
  const meta = {};
  let query = {};
  if (user.isAdmin) {
    query = {};
  } else {
    query = {
      $and: [
        {
          active: true,
        },
        {
          $or: [
            { access: 'public' },
            { 'owners.id': user.sub },
            { tenant: user.tenant },
          ],
        },
      ],
    };
  }

  const virtualComponents = await VirtualComponent.find(query).lean().exec();

  const defaultVersionIds = virtualComponents.map(
    (virtualComponent) => virtualComponent.defaultVersionId
  );

  const componentConfigs = await ComponentConfig.find({
    componentVersionId: {
      $in: defaultVersionIds,
    },
    tenant: user.tenant,
  })
    .lean()
    .exec();

  res.data = componentConfigs;
  return res.send({
    data: componentConfigs,
    meta,
  });
};
