require('../../src/util/nodemon-env').apply();
const rp = require('request-promise');
const conf = require('../../src/conf');
const CONSTANTS = require('../../src/constants');

let token;

const login = async () => {
    const resp = await rp.post({
        uri: `${conf.getBaseUrl()}/login`,
        json: true,
        body: {
            username: conf.accounts.admin.username,
            password: conf.accounts.admin.password,
        },
    });
    return resp;

};

const userData = async () => {
    const resp = await rp.get({
        uri: `${conf.getApiBaseUrl()}/users/me`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
    });

    console.log(resp);
    return resp;
};

const editUser = async ({ userId }) => {
    const resp = await rp.patch({
        uri: `${conf.getApiBaseUrl()}/users/${userId}`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
        body: {
            firstname: 'adminuser',
        },
    });

    console.log(resp);
};

const createTenant = async () => {
    const resp = await rp.post({
        uri: `${conf.getApiBaseUrl()}/tenants`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
        body: {
            name: 'test-tenant',
        },
    });

    return resp;
};

const editTenant = async ({ tenantId }) => {
    const resp = await rp.patch({
        uri: `${conf.getApiBaseUrl()}/tenants/${tenantId}`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
        body: {
            name: 'test-tenant-new',
        },
    });

    return resp;
};

const createUser = async () => {
    const resp = await rp.post({
        uri: `${conf.getApiBaseUrl()}/users`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
        body: {
            username: 'testuser@example.com',
            firstname: 'test',
            lastname: 'user',
            password: 'blubb',
        },
    });

    return resp;
};

const removeUser = async (id) => {
    const resp = await rp.delete({
        uri: `${conf.getApiBaseUrl()}/users/${id}`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
    });

    return resp;
};

const removeTenant = async (id) => {
    const resp = await rp.delete({
        uri: `${conf.getApiBaseUrl()}/tenants/${id}`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
    });

    return resp;
};

const assignUserToTenant = async ({ user, tenant }) => {
    const resp = await rp.post({
        uri: `${conf.getApiBaseUrl()}/tenants/${tenant}/users`,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-auth-type': 'basic',
        },
        json: true,
        body: {
            role: CONSTANTS.MEMBERSHIP_ROLES.TENANT_GUEST,
            user,
        },
    });

    return resp;
};

const example = async () => {

    const loginResp = await login();
    token = loginResp.token;
    console.log(token);
    const data = await userData();
    await editUser({ userId: data._id });
    const tenant = await createTenant();
    console.log('TENANT', tenant);
    await editTenant({ tenantId: tenant.id });
    const newUser = await createUser();
    console.log('newUser', newUser);
    await assignUserToTenant({ user: newUser.id, tenant: tenant.id });
    await removeUser(newUser.id);
    await removeTenant(tenant.id);

};

example();
