const VirtualComponent = require('../../models/VirtualComponent');
const ComponentConfig = require('../../models/ComponentConfig');

module.exports = async function (req, res) {
  const { user } = req;
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

  const virtualComponents = await VirtualComponent.find(query).lean();
  const defaultVersionIds = virtualComponents.map(
    (virtualComponent) => virtualComponent.defaultVersionId
  );

  let configQuery = user.isAdmin
    ? {}
    : {
        $and: [
          {
            tenant: user.tenant,
          },
          {
            componentVersionId: { $in: defaultVersionIds },
          },
        ],
      };

  const componentConfigs = await ComponentConfig.find(configQuery)
    .lean()
    .exec();

  return res.send({
    data: componentConfigs,
  });
};
