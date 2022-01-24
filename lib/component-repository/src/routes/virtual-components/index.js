const express = require('express');
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser').json();

const config = require('../../config');
const VirtualComponent = require('../../models/VirtualComponent');

const isValidVirtualComponent = (virtualComponent, user) => {
  if (virtualComponent.access === 'public') {
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

const loadVirtualComponent = async (req, res, next) => {
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

module.exports = ({ iam }) => {
  const { can } = iam;
  const loadVirtualComp = asyncHandler(loadVirtualComponent);
  // const canRead = asyncHandler(checkReadAccess({iam}));
  // const canWrite = asyncHandler(checkWriteAccess);

  // const GetList = asyncHandler(require('./GetList'));
  // const Create = asyncHandler(require('./Create'));
  // const GetOne = asyncHandler(require('./GetOne'));

  const GetVirtualComponents = asyncHandler(require('./GetVirtualComponents'));
  const CreateVirtualComponent = asyncHandler(
    require('./CreateVirtualComponent')
  );
  const UpdateVirtualComponent = asyncHandler( require('./UpdateVirtualComponent'));
  const GetVirtualComponent = asyncHandler( require('./GetOneVirtualComponent'));
  const CreateComponentVersion = asyncHandler(
    require('./CreateComponentVersion')
  );

  const GetAction = asyncHandler(
    require('./GetAction')
  );

  const GetTrigger = asyncHandler(
    require('./GetTrigger')
  );

  const GetComponentVersion = asyncHandler(require('./GetComponentVersion'));
  const CreateComponentConfig = asyncHandler(require('./CreateComponentConfig'));
  const UpdateComponentConfig = asyncHandler(require('./UpdateComponentConfig'));

  const router = express.Router();
  router.use(asyncHandler(iam.middleware));
  router.use((req, res, next) => {
    req.logger.trace({ user: req.user }, 'Resolved IAM user');
    return next();
  });

  // Virtual Components
  router.get('/', GetVirtualComponents);
  router.post(
    '/',
    can(config.componentsCreatePermission),
    bodyParser,
    CreateVirtualComponent
  );
  router.get('/:id', loadVirtualComp, GetVirtualComponent);
  router.patch('/:id', can(config.componentsUpdatePermission), loadVirtualComp, bodyParser, UpdateVirtualComponent);


  // Component versions
  // router.get('/defaults', GetVirtualComponents);
  router.post(
    '/:id',
    can(config.componentsCreatePermission),
    loadVirtualComp,
    bodyParser,
    CreateComponentVersion
  );

  // To Implement
  router.get('/:id/:componentVersionId', GetComponentVersion);
  router.post('/:id/:componentVersionId/config', CreateComponentConfig);
  router.patch('/:id/:componentVersionId/config', UpdateComponentConfig);
  router.get('/:id/:componentVersionId/actions/:actionName', GetAction);
  router.get('/:id/:componentVersionId/triggers/:triggerName', GetTrigger);

  return router;
};
