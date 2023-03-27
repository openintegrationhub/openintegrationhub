const VirtualComponent = require('../../models/VirtualComponent');
const ComponentVersion = require('../../models/ComponentVersion');

const lightProjectionFields = {
  name: 1,
  authorization: 1,
  logo: 1,
  description: 1,
  componentId: 1,
  virtualComponentId: 1,
  'triggers.name': 1,
  'triggers.title': 1,
  'triggers.description': 1,
  'triggers.active': 1,
  'actions.title': 1,
  'actions.name': 1,
  'actions.description': 1,
  'actions.active': 1,
};

module.exports = async function (req, res) {
  const { verbose, filterActiveFunctions } = req.query;
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
            { 'owners.id': user.tenant },
            { tenant: user.tenant },
          ],
        },
      ],
    };
  }

  const virtualComponents = await VirtualComponent.find(query, {
    _id: 0,
    defaultVersionId: 1,
  }).lean();

  const virtualComponentIds = virtualComponents.map(
    (virtualComponent) => virtualComponent.defaultVersionId
  );

  let projection = {};

  if (verbose === 'false') {
    projection = lightProjectionFields;
  }

  const componentVersions = await ComponentVersion.find(
    {
      _id: {
        $in: virtualComponentIds,
      },
    },
    projection
  );

  if (filterActiveFunctions) {
    componentVersions.forEach((component) => {
      component.triggers = component.triggers.filter(({ active }) => active);
      component.actions = component.actions.filter(({ active }) => active);
    });
  }

  res.data = componentVersions;

  return res.send({
    data: componentVersions,
    meta,
  });
};
