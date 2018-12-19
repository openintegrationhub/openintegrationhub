process.env.AUTH_TYPE = 'basic';
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;

const mockgoose = new Mockgoose(mongoose);
const request = require('supertest')('http://localhost:3099');

const CONSTANTS = require('./../src/constants');
const { PERMISSIONS, RESTRICTED_PERMISSIONS } = require('./../src/access-control/permissions');

let conf = null;

describe('Role Routes', () => {
    const testUser = {
        id: '',
        username: 'blubb@exmaple.com',
        password: 'blubb',
    };
    let tenantAdminToken = null;

    // Token will be set via Login and is valid 3h
    let tokenAdmin = null;
    let app = null;
    let TenantID = null;
    let TenantUserId = null;
    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_AUTH_TYPE = 'basic';
        conf = require('./../src/conf/index');
        const App = require('../src/app');
        app = new App();
        await mockgoose.prepareStorage();
        await app.setup(mongoose);
        await app.start();

        setTimeout(async () => {

            const jsonPayload = {
                username: conf.accounts.admin.username,
                password: conf.accounts.admin.password,
            };
            const response = await request.post('/login')
                .send(jsonPayload)
                .set('Accept', /application\/json/)
                .expect(200);
            tokenAdmin = `Bearer ${response.body.token}`;

            /**
             * Create a test tenant and a test user
             * */
            const tenantPayload = {
                'name': 'testTenant',
                'confirmed': true,
                'status': CONSTANTS.STATUS.ACTIVE,
            };
            const tenantResponse = await request.post('/api/v1/tenants')
                .send(tenantPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            TenantID = tenantResponse.body.id;

            const tenantAdminPayload = {
                'username': testUser.username,
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': testUser.password,
                'role': CONSTANTS.ROLES.USER,
                memberships: [{
                    tenant: TenantID,
                    permissions: [
                        PERMISSIONS['tenant.all'],
                    ],
                }],
            };
            const userResponse = await request.post('/api/v1/users')
                .send(tenantAdminPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            TenantUserId = userResponse.body.id;

            const loginResponse = await request.post('/login')
                .send({
                    username: tenantAdminPayload.username,
                    password: tenantAdminPayload.password,
                })
                .set('Accept', /application\/json/)
                .expect(200);
            tenantAdminToken = `Bearer ${loginResponse.body.token}`;

            const contextResponse = await request.post('/context')
                .send({
                    tenant: TenantID,
                })
                .set('Authorization', tenantAdminToken)
                .set('Accept', /application\/json/)
                .expect(200);

            // Fetch new token
            // tokenUser = `Bearer ${contextResponse.body.token}`;
            console.log(tenantAdminToken);

            done();

        }, 200);

    });

    afterAll(() => {
        app.stop();
    });

    test('get current context is successful', async () => {
        const response = await request.get('/context')
            .set('Accept', /application\/json/)
            .set('Authorization', tenantAdminToken)
            .expect(200);
        expect(response.body.currentContext.tenant).toEqual(TenantID);
    });

    test('fails setting current context if user does not have corresponding membership', async () => {

        const tenantPayload = {
            'name': 'testTenant34',
            'confirmed': true,
            'status': CONSTANTS.STATUS.ACTIVE,
        };
        const tenantResponse = await request.post('/api/v1/tenants')
            .send(tenantPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const newTenantID = tenantResponse.body.id;

        await request.post('/context')
            .send({
                tenant: newTenantID,
            })
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(403);
    });

    test('get all roles is successful', async () => {
        const response = await request.get('/api/v1/roles')
            .set('Accept', /application\/json/)
            .set('Authorization', tenantAdminToken)
            .expect(200);
        expect(response.body.length).toBe(0);
    });

    test('role is successfully created and assigned to user', async () => {
        const role = {
            name: 'CustomRole',
            // TODO: should this really be a reference? It may cause a lot of DB lookups
            permissions: [PERMISSIONS['tenant.roles.read']],
            description: 'Lorem ipsum',
        };

        await request.post('/api/v1/roles')
            .send(role)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        const responseRoles = await request.get('/api/v1/roles')
            .set('Accept', /application\/json/)
            .set('Authorization', tenantAdminToken)
            .expect(200);
        expect(responseRoles.body.length).toBe(1);

    });

    test('Request fails if permission is missing', async () => {

        const testUserData = {
            'username': 'testuser57@example.com',
            'firstname': 'test',
            'lastname': 'user',
            'status': 'ACTIVE',
            'password': 'usertest',
            'role': CONSTANTS.ROLES.USER,
        };
        /* Create new user and a new service account */

        const createUserResponse = await request.post('/api/v1/users')
            .send(testUserData)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const userId = createUserResponse.body.id;

        /* Log in as service account */
        const response = await request.post('/login')
            .send({
                username: testUserData.username,
                password: testUserData.password,
            })
            .set('Accept', /application\/json/)
            .expect(200);
        const userToken = `Bearer ${response.body.token}`;

        await request.post('/api/v1/tokens')
            .send({
                accountId: userId,
                expiresIn: '1h',
                consumerServiceId: 'someId',
            })
            .set('Authorization', userToken)
            .set('Accept', /application\/json/)
            .expect(403);

    });

    test('User context permissions are extended with role permissions', async () => {

        const testUserData = {
            'username': 'testuser60@example.com',
            'firstname': 'test',
            'lastname': 'user',
            'status': 'ACTIVE',
            'password': 'usertest',
            'role': CONSTANTS.ROLES.USER,
        };
        /* Create new user and a new service account */

        const createUserResponse = await request.post('/api/v1/users')
            .send(testUserData)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const userId = createUserResponse.body.id;

        /* Log in as service account */
        const response = await request.post('/login')
            .send({
                username: testUserData.username,
                password: testUserData.password,
            })
            .set('Accept', /application\/json/)
            .expect(200);
        const userToken = `Bearer ${response.body.token}`;

        const role = {
            name: 'CustomRole2',
            permissions: [PERMISSIONS['tenant.profile.read']],
            description: 'Lorem ipsum',
        };

        const roleResp = await request.post('/api/v1/roles')
            .send(role)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        const jsonPayload = {
            user: userId,
            role: roleResp.body._id,
            permissions: [PERMISSIONS['tenant.roles.read']],
        };

        await request.post(`/api/v1/tenants/${TenantID}/users`)
            .send(jsonPayload)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        await request.post('/context')
            .send({
                tenant: TenantID,
            })
            .set('Authorization', userToken)
            .set('Accept', /application\/json/)
            .expect(200);

        const tenantProfile = await request.get(`/api/v1/tenants/${TenantID}/profile`)
            .set('Accept', /application\/json/)
            .set('Authorization', userToken)
            .expect(200);
        expect(tenantProfile.body).toBeDefined();
        expect(tenantProfile.body._id).toBe(TenantID);

        const tenantRole = await request.get(`/api/v1/roles/${roleResp.body._id}`)
            .set('Accept', /application\/json/)
            .set('Authorization', userToken)
            .expect(200);
        expect(tenantRole.body).toBeDefined();
        expect(tenantRole.body._id).toBe(roleResp.body._id);

    });

    test('Extend user permissions with custom permissions', async () => {

        const testUserData = {
            'username': 'testuser130@example.com',
            'firstname': 'test',
            'lastname': 'user',
            'status': 'ACTIVE',
            'password': 'usertest',
            'role': CONSTANTS.ROLES.USER,
        };
        /* Create new user and a new service account */

        const createUserResponse = await request.post('/api/v1/users')
            .send(testUserData)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const userId = createUserResponse.body.id;

        const newTokenResp1 = await request.post('/api/v1/tokens')
            .send({
                accountId: userId,
                expiresIn: '1h',
                consumerServiceId: 'someId',
            })
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const introspect1 = await request.post('/api/v1/tokens/introspect')
            .send({
                token: newTokenResp1.body.token,
            })
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        expect(introspect1.body.permissions.length).toBe(0);

        const newTokenResp2 = await request.post('/api/v1/tokens')
            .send({
                accountId: userId,
                expiresIn: '1h',
                consumerServiceId: 'someId',
                customPermissions: [PERMISSIONS['tenant.roles.read']],
            })
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const introspect2 = await request.post('/api/v1/tokens/introspect')
            .send({
                token: newTokenResp2.body.token,
            })
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        expect(introspect2.body.permissions.length).toBe(1);
        expect(introspect2.body.permissions[0]).toBe(PERMISSIONS['tenant.roles.read']);

    });

    test('fails for an unknown or restricted permission', async () => {

        await request.post('/api/v1/roles')
            .send({
                name: 'CustomRole34',
                permissions: [PERMISSIONS['some.random.permissions']],
                description: 'Lorem ipsum',
            })
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(403);

        /* Missing role name results in 400 */
        await request.post('/api/v1/roles')
            .send({
                permissions: [PERMISSIONS['some.random.permissions']],
                description: 'Lorem ipsum',
            })
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(400);

        await request.post('/api/v1/roles')
            .send({
                name: CONSTANTS.MEMBERSHIP_ROLES.TENANT_ADMIN,
                permissions: [PERMISSIONS['tenant.roles.read']],
                description: 'Lorem ipsum',
            })
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(403);

        const roleResp = await request.post('/api/v1/roles')
            .send({
                name: 'ValidRoleName',
                permissions: [PERMISSIONS['tenant.roles.read']],
                description: 'Lorem ipsum',
            })
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        await request.patch(`/api/v1/roles/${roleResp.body._id}`)
            .send({
                description: 'Lorem ipsum foo bar 21',
            })
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        await request.patch(`/api/v1/roles/${roleResp.body._id}`)
            .send({
                name: CONSTANTS.MEMBERSHIP_ROLES.TENANT_ADMIN,
                permissions: [PERMISSIONS['tenant.roles.read']],
                description: 'Lorem ipsum',
            })
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(403);

    });

    test('tenant admin can delete role', async () => {

        const testUserData = {
            'username': 'testuser62@example.com',
            'firstname': 'test',
            'lastname': 'user',
            'status': 'ACTIVE',
            'password': 'usertest',
            'role': CONSTANTS.ROLES.USER,
        };
        /* Create new user and a new service account */

        const createUserResponse = await request.post('/api/v1/users')
            .send(testUserData)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const userId = createUserResponse.body.id;

        const response = await request.post('/login')
            .send({
                username: testUserData.username,
                password: testUserData.password,
            })
            .set('Accept', /application\/json/)
            .expect(200);
        const userToken = `Bearer ${response.body.token}`;

        const role = {
            name: 'CustomRole5',
            permissions: [PERMISSIONS['tenant.profile.read']],
            description: 'Lorem ipsum',
        };

        const roleResp = await request.post('/api/v1/roles')
            .send(role)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        const jsonPayload = {
            user: userId,
            role: roleResp.body._id,
            permissions: [PERMISSIONS['tenant.roles.read']],
        };

        await request.post(`/api/v1/tenants/${TenantID}/users`)
            .send(jsonPayload)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        await request.post('/context')
            .send({
                tenant: TenantID,
            })
            .set('Authorization', userToken)
            .set('Accept', /application\/json/)
            .expect(200);

        const tenantProfile = await request.get(`/api/v1/tenants/${TenantID}/profile`)
            .set('Accept', /application\/json/)
            .set('Authorization', userToken)
            .expect(200);
        expect(tenantProfile.body).toBeDefined();
        expect(tenantProfile.body._id).toBe(TenantID);

        const tenantRole = await request.get(`/api/v1/roles/${roleResp.body._id}`)
            .set('Accept', /application\/json/)
            .set('Authorization', userToken)
            .expect(200);
        expect(tenantRole.body).toBeDefined();
        expect(tenantRole.body._id).toBe(roleResp.body._id);

        let userProfileResponse = await request.get('/api/v1/users/me')
            .set('Accept', /application\/json/)
            .set('Authorization', userToken)
            .expect(200);
        expect(userProfileResponse.body).toBeDefined();
        expect(userProfileResponse.body.memberships[0].role).toBeDefined();
        console.log('USER MEMBERSHIP', userProfileResponse.body.memberships);

        // Tenant Admin deletes role. All users with this role should now loose the role
        await request.delete(`/api/v1/roles/${roleResp.body._id}`)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        userProfileResponse = await request.get('/api/v1/users/me')
            .set('Accept', /application\/json/)
            .set('Authorization', userToken)
            .expect(200);
        expect(userProfileResponse.body).toBeDefined();
        expect(userProfileResponse.body.memberships[0].role).not.toBeDefined();
        console.log('USER MEMBERSHIP #2', userProfileResponse.body.memberships);

        await request.get(`/api/v1/roles/${roleResp.body._id}`)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(404);

    });

    test('tenant admin can only access her own roles', async () => {

        /**
         * Create second test tenant and a test user
         * */
        const tenantPayload = {
            'name': 'testTenant2',
            'confirmed': true,
            'status': CONSTANTS.STATUS.ACTIVE,
        };
        const tenantResponse = await request.post('/api/v1/tenants')
            .send(tenantPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const newTenantId = tenantResponse.body.id;

        const tenantAdminPayload2 = {
            'username': 'testuser22@basaas.de',
            'firstname': 'blubb',
            'lastname': 'blubb',
            'status': 'ACTIVE',
            'password': testUser.password,
            'role': CONSTANTS.ROLES.USER,
            memberships: [{
                tenant: newTenantId,
                permissions: [
                    PERMISSIONS['tenant.all'],
                ],
            }],
        };
        const userResponse = await request.post('/api/v1/users')
            .send(tenantAdminPayload2)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const TenantUserId2 = userResponse.body.id;

        const loginResponse = await request.post('/login')
            .send({
                username: tenantAdminPayload2.username,
                password: tenantAdminPayload2.password,
            })
            .set('Accept', /application\/json/)
            .expect(200);
        const tenantAdminToken2 = `Bearer ${loginResponse.body.token}`;

        const contextResponse = await request.post('/context')
            .send({
                tenant: newTenantId,
            })
            .set('Authorization', tenantAdminToken2)
            .set('Accept', /application\/json/)
            .expect(200);

        /* ----------*/

        const login2 = await request.post('/login')
            .send({
                username: tenantAdminPayload2.username,
                password: tenantAdminPayload2.password,
            })
            .set('Accept', /application\/json/)
            .expect(200);
        const tenantAdmin2Token = `Bearer ${login2.body.token}`;

        const role = {
            name: 'CustomRole77',
            permissions: [PERMISSIONS['tenant.profile.read']],
            description: 'Lorem ipsum',
        };

        const roleResp1 = await request.post('/api/v1/roles')
            .send(role)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        const roleResp2 = await request.post('/api/v1/roles')
            .send(role)
            .set('Authorization', tenantAdmin2Token)
            .set('Accept', /application\/json/)
            .expect(200);

        await request.get(`/api/v1/roles/${roleResp1.body._id}`)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(200);

        await request.get(`/api/v1/roles/${roleResp1.body._id}`)
            .set('Authorization', tenantAdmin2Token)
            .set('Accept', /application\/json/)
            .expect(403);

        await request.get(`/api/v1/roles/${roleResp2.body._id}`)
            .set('Authorization', tenantAdminToken)
            .set('Accept', /application\/json/)
            .expect(403);

        await request.get(`/api/v1/roles/${roleResp2.body._id}`)
            .set('Authorization', tenantAdmin2Token)
            .set('Accept', /application\/json/)
            .expect(200);

    });

});
