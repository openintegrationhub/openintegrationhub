
const { ROLES, MEMBERSHIP_ROLES } = require('../constants');

const PERMISSIONS = {

    restricted: {

        'all': 'all',
        'iam.tenant.create': 'iam.tenant.create',
        'iam.tenant.read': 'iam.tenant.read',
        'iam.tenant.update': 'iam.tenant.update',
        'iam.tenant.delete': 'iam.tenant.delete',

        'iam.secret.create': 'iam.secret.create',
        'iam.secret.read': 'iam.secret.read',

        'iam.key.create': 'iam.key.create',
        'iam.key.read': 'iam.key.read',
        'iam.key.delete': 'iam.key.delete',

        'iam.account.create': 'iam.account.create',
        'iam.account.read': 'iam.account.read',
        'iam.account.update': 'iam.account.update',
        'iam.account.delete': 'iam.account.delete',

        'iam.token.create': 'iam.token.create',
        'iam.token.update': 'iam.token.update',
        'iam.token.delete': 'iam.token.delete',

        'iam.token.introspect': 'iam.token.introspect',

        'secrets.secret.deleteAny': 'secrets.secret.deleteAny',
        'secrets.authClient.deleteAny': 'secrets.authClient.deleteAny',

    },

    common: {

        'tenant.all': 'tenant.all',

        'tenant.account.read': 'tenant.account.read',
        'tenant.account.create': 'tenant.account.create',
        'tenant.account.update': 'tenant.account.update',
        'tenant.account.delete': 'tenant.account.delete',

        'tenant.membership.create': 'tenant.membership.create',
        'tenant.membership.update': 'tenant.membership.update',
        'tenant.membership.delete': 'tenant.membership.delete',

        'tenant.profile.read': 'tenant.profile.read',
        'tenant.profile.update': 'tenant.profile.update',
        'tenant.profile.delete': 'tenant.profile.delete',

        'tenant.roles.read': 'tenant.roles.read',
        'tenant.roles.create': 'tenant.roles.create',
        'tenant.roles.update': 'tenant.roles.update',
        'tenant.roles.delete': 'tenant.roles.delete',

        'tenant.flows.read': 'tenant.flows.read',
        'tenant.flows.create': 'tenant.flows.create',
        'tenant.flows.update': 'tenant.flows.update',
        'tenant.flows.delete': 'tenant.flows.delete',

        'metadata.domains.crud': 'metadata.domains.crud',

        'secrets.secret.readRaw': 'secrets.secret.readRaw',
        'secrets.authClient.readRaw': 'secrets.authClient.readRaw',
    },

};

const DEFAULT_ROLES = {

    [ROLES.ADMIN]: ['all'],

    [ROLES.USER]: [
        PERMISSIONS.common['tenant.profile.read'],
        PERMISSIONS.common['tenant.roles.read'],
    ],

    [MEMBERSHIP_ROLES.TENANT_ADMIN]: [

        PERMISSIONS.common['tenant.all'],

        PERMISSIONS.common['tenant.profile.read'],
        PERMISSIONS.common['tenant.profile.update'],

        PERMISSIONS.common['tenant.roles.read'],
        PERMISSIONS.common['tenant.roles.create'],
        PERMISSIONS.common['tenant.roles.update'],
        PERMISSIONS.common['tenant.roles.delete'],

        PERMISSIONS.common['tenant.flows.read'],
        PERMISSIONS.common['tenant.flows.create'],
        PERMISSIONS.common['tenant.flows.update'],
        PERMISSIONS.common['tenant.flows.delete'],
    ],

};

const permissionIsCommon = (permission) => PERMISSIONS.common[permission];

const permissionsAreCommon = (permissions) => {

    /* eslint-disable-next-line no-restricted-syntax  */
    for (const perm of permissions) {
        const isCommon = permissionIsCommon(perm);
        if (!isCommon) {
            return false;
        }
    }

    return true;

};

const roleNameIsRestricted = (name) => Object.keys(ROLES).map((elem) => elem.toLowerCase())
    .indexOf(name.toLowerCase()) >= 0
    || Object.keys(MEMBERSHIP_ROLES).map((elem) => elem.toLowerCase())
        .indexOf(name.toLowerCase()) >= 0;

module.exports = {
    RESTRICTED_PERMISSIONS: PERMISSIONS.restricted,
    PERMISSIONS: PERMISSIONS.common,
    DEFAULT_ROLES,
    permissionIsCommon,
    permissionsAreCommon,
    roleNameIsRestricted, // TODO move current ADMIN role to permissions and do not rely on role name anymore
};
