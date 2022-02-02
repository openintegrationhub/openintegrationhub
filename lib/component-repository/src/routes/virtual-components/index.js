const express = require('express');
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser').json();

const config = require('../../config');
const VirtualComponent = require('../../models/VirtualComponent');

const isValidVirtualComponent = (virtualComponent, user) => {
  if (virtualComponent.access === 'public' || user.isAdmin) {
    return true;
  }
  if (
    virtualComponent.access === 'private' &&
    (user.tenant === virtualComponent.tenant ||
      virtualComponent.owners.some(({ id }) => id === user.sub))
  ) {
    return true;
  }
  return false;
};

const loadVirtualComponent = async (req, _, next) => {
  const { id } = req.params;
  const { user } = req;
  const virtualComponent = await VirtualComponent.findById(id);

  if (!virtualComponent || !isValidVirtualComponent(virtualComponent, user)) {
    const error = new Error('VirtualComponent is not found');
    error.statusCode = 404;
    throw error;
  }
  req.virtualComponent = virtualComponent;

  return next();
};

const canWriteVComponent = (req, _, next) => {
  const { virtualComponent, user } = req;

  if (virtualComponent.access === 'public' && !user.isAdmin) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }

  next();
};

module.exports = ({ iam }) => {
  const { can } = iam;
  const loadVirtualComp = asyncHandler(loadVirtualComponent);

  const GetVirtualComponents = asyncHandler(require('./GetVirtualComponents'));
  const GetDefaultVirtualComponents = asyncHandler(
    require('./GetDefaultVirtualComponents')
  );
  const GetDefaultVirtualComponentsConfig = asyncHandler(
    require('./GetDefaultVirtualComponentsConfig')
  );
  const CreateVirtualComponent = asyncHandler(
    require('./CreateVirtualComponent')
  );
  const UpdateVirtualComponent = asyncHandler(
    require('./UpdateVirtualComponent')
  );
  const UpdateComponentVersion = asyncHandler(
    require('./UpdateComponentVersion')
  );
  const GetVirtualComponent = asyncHandler(require('./GetOneVirtualComponent'));
  const CreateComponentVersion = asyncHandler(
    require('./CreateComponentVersion')
  );
  const DeleteComponentVersion = asyncHandler(require('./DeleteComponentVersion'));

  const GetAction = asyncHandler(require('./GetAction'));

  const GetTrigger = asyncHandler(require('./GetTrigger'));

  const GetComponentVersion = asyncHandler(require('./GetComponentVersion'));
  const CreateComponentConfig = asyncHandler(
    require('./CreateComponentConfig')
  );
  const UpdateComponentConfig = asyncHandler(
    require('./UpdateComponentConfig')
  );

  const DeleteVirtualComponent = asyncHandler(
    require('./DeleteVirtualComponent')
  );

  const router = express.Router();
  router.use(asyncHandler(iam.middleware));
  router.use((req, _, next) => {
    req.logger.trace({ user: req.user }, 'Resolved IAM user');
    return next();
  });

  // Virtual Components
  router.get('/', GetVirtualComponents);
  router.get('/defaults', GetDefaultVirtualComponents);
  router.get('/defaults/config', GetDefaultVirtualComponentsConfig);
  router.post(
    '/',
    can(config.componentsCreatePermission),
    bodyParser,
    CreateVirtualComponent
  );
  router.get('/:id', loadVirtualComp, GetVirtualComponent);
  router.patch(
    '/:id',
    can(config.componentsUpdatePermission),
    loadVirtualComp,
    canWriteVComponent,
    bodyParser,
    UpdateVirtualComponent
  );
  router.delete(
    '/:id',
    can(config.componentDeletePermission),
    loadVirtualComp,
    canWriteVComponent,
    DeleteVirtualComponent
  );

  // Component versions
  router.post(
    '/:id',
    can(config.componentsCreatePermission),
    loadVirtualComp,
    canWriteVComponent,
    bodyParser,
    CreateComponentVersion
  );
  router.patch(
    '/:id/:componentVersionId',
    can(config.componentsUpdatePermission),
    loadVirtualComp,
    canWriteVComponent,
    bodyParser,
    UpdateComponentVersion
  );

  // Component versions
  // router.put(
  //   '/:id/:componentVersionId',
  //   can(config.componentsUpdatePermission),
  //   loadVirtualComp,
  //   bodyParser,
  //   CreateComponentVersion
  // );
  router.delete(
    '/:id/:componentVersionId',
    can(config.componentDeletePermission),
    loadVirtualComp,
    DeleteComponentVersion
  );
  // To Implement
  router.get('/:id/:componentVersionId',loadVirtualComp, GetComponentVersion);
  router.post('/:id/:componentVersionId/config', can(config.componentsCreatePermission), loadVirtualComp, bodyParser, CreateComponentConfig);
  router.patch('/:id/:componentVersionId/config', can(config.componentsUpdatePermission), loadVirtualComp, bodyParser, UpdateComponentConfig);
  router.get('/:id/:componentVersionId/actions/:actionName',loadVirtualComp, GetAction);
  router.get('/:id/:componentVersionId/triggers/:triggerName',loadVirtualComp, GetTrigger);

  return router;
};
