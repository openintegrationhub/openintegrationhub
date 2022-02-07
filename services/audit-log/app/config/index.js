// General configuration file for variable urls, settings, etc.

const general = {
    mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/auditLogDev',
    oihAdminRoles: ['ADMIN'],

    logReadPermission: process.env.LOG_READ_PERMISSION || 'logs.read',
    logPushPermission: process.env.LOG_PUSH_PERMISSION || 'logs.push',

    // Designates which storage system (Mongo, Kubernetes, MySQL, etc.) is used
    storage: 'mongo',

    amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',

    eventNames: [
        'iam.user.created',
        'iam.user.deleted',
        'iam.user.modified',
        'iam.user.removedFromTenant',
        'iam.user.assignedToTenant',
        'iam.user.loginFailed',
        'iam.tenant.created',
        'iam.tenant.deleted',
        'iam.tenant.modified',
        'iam.role.created',
        'iam.role.deleted',
        'iam.role.modified',
        'iam.token.created',
        'iam.token.deleted',
        'iam.token.modified',
        'iam.permission.created',
        'iam.permission.deleted',
        'iam.permission.modified',
        'secret-service.secret.created',
        'secret-service.secret.deleted',
        'secret-service.token.get',
        'metadata.domain.created',
        'metadata.domain.deleted',
        'metadata.domain.modified',
        'metadata.schema.created',
        'metadata.schema.deleted',
        'metadata.schema.modified',
        'flowrepo.flow.created',
        'flowrepo.flow.modified',
        'flowrepo.flow.deleted',
        'templaterepo.template.created',
        'templaterepo.template.modified',
        'templaterepo.template.deleted',
    ],

    gdprEventName: 'iam.user.deleted',
};

module.exports = general;
