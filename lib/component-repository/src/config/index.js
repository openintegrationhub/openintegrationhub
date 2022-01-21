const configuration = {
    componentsCreatePermission: process.env.COMPONENT_WRITE_PERMISSION || 'component.create',
    componentsUpdatePermission: process.env.COMPONENT_UPDATE_PERMISSION || 'component.update',
    componentDeletePermission: process.env.COMPONENT_DELETE_PERMISSION || 'component.delete',
    adminPermission: process.env.ADMIN_PERMISSION || 'all'
};

module.exports = configuration;
