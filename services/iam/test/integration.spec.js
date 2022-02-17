process.env.AUTH_TYPE = 'basic';
const mongoose = require('mongoose');
const request = require('supertest')('http://localhost:3099');
const CONSTANTS = require('../src/constants');
const { PERMISSIONS, RESTRICTED_PERMISSIONS } = require('../src/access-control/permissions');

let conf = null;

// Token will be set via Login and is valid 3h
let tokenAdmin = null;
describe('routes', () => {
    let app = null;
    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_AUTH_TYPE = 'basic';
        process.env.IAM_BASEURL = 'http://localhost';
        conf = require('../src/conf/index');
        const App = require('../src/app');

        app = new App({
            mongoConnection: global.__MONGO_URI__.replace('changeme', 'integration'),
        });

        await app.setup();
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

        });

        done();
    });

    afterAll(() => {
        app.stop();
    });

    describe('General Routes', () => {

        let tempLoginToken = '';

        test('login successful', async () => {
            const jsonPayload = {
                username: conf.accounts.admin.username,
                password: conf.accounts.admin.password,
            };
            const response = await request.post('/login')
                .send(jsonPayload)
                .set('Accept', /application\/json/)
                .expect(200);
            tempLoginToken = `Bearer ${response.body.token}`;

        });

        test('login fails for wrong username', async () => {
            const jsonPayload = {
                username: 'blubb@basaas.com',
                password: 'password123!',
            };
            const response = await request.post('/login')
                .send(jsonPayload)
                .set('Accept', /application\/json/)
                .expect(401);
            expect(response.body.message).toBe(CONSTANTS.ERROR_CODES.USER_NOT_FOUND);

        });

        test('login fails with wrong password', async () => {
            const jsonPayload = {
                username: conf.accounts.admin.username,
                password: 'blubb!',
            };
            const response = await request.post('/login')
                .send(jsonPayload)
                .set('Accept', /application\/json/)
                .expect(401);
            expect(response.body.message).toBe(CONSTANTS.ERROR_CODES.PASSWORD_INCORRECT);

        });

        test('get redirect for error call', async () => {
            await request.get('/')
                .set('Accept', 'text/html')
                .expect(200);
        });

        test('healthcheck', async () => {
            await request.get('/healthcheck')
                .set('Accept', /application\/json/)
                .expect(200);
            // expect(response.body).toBe(0);

        });

        test('logout is successful', async () => {

            const testUserData = {
                'username': 'logout@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                'role': CONSTANTS.ROLES.USER,
            };

            await request.post('/api/v1/users')
                .send(testUserData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const response = await request.post('/login')
                .send({
                    username: testUserData.username,
                    password: testUserData.password,
                })
                .set('Accept', /application\/json/)
                .expect(200);
            tempLoginToken = `Bearer ${response.body.token}`;

            await request.get('/api/v1/users/me')
                .set('Authorization', tempLoginToken)
                .set('Accept', /application\/json/)
                .expect(200);

            await request.post('/logout')
                .set('Accept', /application\/json/)
                .set('Authorization', tempLoginToken)
                .expect(200);

            await request.get('/api/v1/users/me')
                .set('Authorization', tempLoginToken)
                .set('Accept', /application\/json/)
                .expect(401);
        });

    });

    describe('Integration between all Routes', () => {
        let testUserId = null;
        let TenantID = null;

        beforeEach(async (done) => {

            const jsonPayload = {
                'name': 'testTenant',
                'confirmed': true,
                'status': 'ACTIVE',
            };

            const response = await request.post('/api/v1/tenants')
                .send(jsonPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            TenantID = response.body.id;

            const testUserData = {
                'username': 'blubb@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                tenant: TenantID,
            };

            const response2 = await request.post('/api/v1/users')
                .send(testUserData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            testUserId = response2.body.id;

            done();

        });

        afterEach(async (done) => {

            const response = await request.get('/api/v1/tenants')
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* eslint-disable-next-line no-restricted-syntax  */
            for (const tenant of response.body) {
                /* eslint-disable-next-line no-await-in-loop  */
                await request.delete(`/api/v1/tenants/${tenant._id}`)
                    .set('Authorization', tokenAdmin)
                    .set('Accept', /application\/json/)
                    .expect(200);
            }

            done();

        });

        test('Tenant users are returned', async () => {

            const tenantAdminUser = {
                'username': 'blubb2@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                tenant: TenantID,
                permissions: [PERMISSIONS['tenant.all']],
            };

            const tenantNormalUser = {
                'username': 'blubb3@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                tenant: TenantID,
            };

            await request.post('/api/v1/users')
                .send(tenantAdminUser)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const loginResponse = await request.post('/login')
                .send({
                    username: tenantAdminUser.username,
                    password: tenantAdminUser.password,
                })
                .set('Accept', /application\/json/);

            const tenantAdminToken = `Bearer ${loginResponse.body.token}`;

            const response1 = await request.get(`/api/v1/tenants/${TenantID}/users`)
                .set('Authorization', tenantAdminToken)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response1.body.length).toBe(2);

            await request.post('/api/v1/users')
                .send(tenantNormalUser)
                .set('Authorization', tenantAdminToken)
                .set('Accept', /application\/json/)
                .expect(200);

            const response2 = await request.get(`/api/v1/tenants/${TenantID}/users`)
                .set('Authorization', tenantAdminToken)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response2.body.length).toBe(3);

        });

        // FIXME
        test('tenant can be edited by tenant admin', async () => {

            const tenantPayload = {
                'name': 'testTenant22',
                'confirmed': true,
                'status': 'ACTIVE',
            };

            const newTenantName = 'testTenant22-NEW';

            const response = await request.post('/api/v1/tenants')
                .send(tenantPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const tenantId = response.body.id;

            const tenantAdminUser = {
                'username': 'blubb9876@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                tenant: tenantId,
                permissions: [PERMISSIONS['tenant.all']],
            };

            const tenantNormalUser = {
                'username': 'blubb9877@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                tenant: tenantId,
            };

            await request.post('/api/v1/users')
                .send(tenantNormalUser)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const loginResponseTenantUser = await request.post('/login')
                .send({
                    username: tenantNormalUser.username,
                    password: tenantNormalUser.password,
                })
                .set('Accept', /application\/json/);

            const tenantUserToken = loginResponseTenantUser.body.token;

            // normal user is not allowed to modify tenant
            await request.patch(`/api/v1/tenants/${tenantId}`)
                .send({
                    name: newTenantName,
                })
                .set('Authorization', `Bearer ${tenantUserToken}`)
                .set('Accept', /application\/json/)
                .expect(403);

            await request.post('/api/v1/users')
                .send(tenantAdminUser)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const loginResponseTenantAdmin = await request.post('/login')
                .send({
                    username: tenantAdminUser.username,
                    password: tenantAdminUser.password,
                })
                .set('Accept', /application\/json/);

            const tenantAdminToken = loginResponseTenantAdmin.body.token;

            // tenant admin can modify tenant
            await request.patch(`/api/v1/tenants/${tenantId}`)
                .send({
                    name: newTenantName,
                })
                .set('Authorization', `Bearer ${tenantAdminToken}`)
                .set('Accept', /application\/json/)
                .expect(200);

            expect((await request.get(`/api/v1/tenants/${tenantId}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)).body.name).toBe(newTenantName);

        });

        test('Deleting tenant deletes all tenant users', async () => {

            const jsonPayload = {
                'name': 'testTenant22',
                'confirmed': true,
                'status': 'ACTIVE',
            };
            const response = await request.post('/api/v1/tenants')
                .send(jsonPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const tenantId = response.body.id;

            const tenantAdminUser = {
                'username': 'blubb9876@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                tenant: tenantId,
                permissions: [PERMISSIONS['tenant.all']],
            };

            const tenantNormalUser = {
                'username': 'blubb9877@basaas.com',
                'firstname': 'blubb',
                'lastname': 'blubb',
                'status': 'ACTIVE',
                'password': 'blubb',
                tenant: tenantId,
            };

            await request.post('/api/v1/users')
                .send(tenantAdminUser)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            await request.post('/api/v1/users')
                .send(tenantNormalUser)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const response2 = await request.get(`/api/v1/tenants/${tenantId}/users`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response2.body.length).toBe(2);

            await request.delete(`/api/v1/tenants/${tenantId}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const response3 = await request.get(`/api/v1/tenants/${tenantId}/users`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200); // TODO return 404 if tenant does not exist
            expect(response3.body.length).toBe(0);

            await request.get(`/api/v1/tenants/${tenantId}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(404);

        });

    });

    describe('Token verification', () => {

        test('get all tenants without token fails', async () => {
            await request.get('/api/v1/tenants')
                .set('Accept', /application\/json/)
                .expect(401);
        });

        test('request with an invalid token fails', async () => {

            const pseudoJWT = {
                header: Buffer.from('{"alg": "HS256","typ": "JWT"}').toString('base64'),
                body: Buffer.from('{"username": "admin", "role": "ADMIN"}').toString('base64'),
                sig: Buffer.from('SomeRandomHash').toString('base64'),
            };

            await request.get('/api/v1/tenants')
                .set('Authorization', `Bearer ${pseudoJWT.header}.${pseudoJWT.body}.${pseudoJWT.sig}`)
                .set('Accept', /application\/json/)
                .expect(401);
        });

        test('request with an empty token fails', async () => {

            await request.get('/api/v1/tenants')
                .set('Authorization', '')
                .set('Accept', /application\/json/)
                .expect(401);
        });

        test('request with an invalid authorization header fails', async () => {

            const resp = await request.get('/api/v1/tenants')
                .set('Authorization', 'SomeToken')
                .set('Accept', /application\/json/)
                .expect(401);

            expect(resp.body.message).toBe(CONSTANTS.ERROR_CODES.INVALID_HEADER);

        });

        test('get all tenants with unknown x-auth-type fails', async () => {
            await request.get('/api/v1/tenants')
                .set('Accept', /application\/json/)
                .set('Authorization', tokenAdmin)
                .set('x-auth-type', 'random-auth-type')
                .expect(400);
        });

    });

    describe('Token and session management', () => {

        const testUserData = {
            'username': 'blubb33@basaas.com',
            'firstname': 'blubb',
            'lastname': 'blubb',
            'status': 'ACTIVE',
            'password': 'blubb',
        };

        test('token invalid if user is unauthorized', async () => {

            /* Create new user */

            const createUserResponse = await request.post('/api/v1/users')
                .send(testUserData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const testUserId = createUserResponse.body.id;

            /* Log in as the new user */
            const response = await request.post('/login')
                .send({
                    username: testUserData.username,
                    password: testUserData.password,
                })
                .set('Accept', /application\/json/)
                .expect(200);
            const userToken = `Bearer ${response.body.token}`;
            const userCookie = response.headers['set-cookie'].pop().split(';')[0];

            /* Refresh token success */
            await request.get('/api/v1/tokens/refresh')
                .set('Authorization', userToken)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Admin disables user */
            await request.patch(`/api/v1/users/${testUserId}`)
                .send({ status: CONSTANTS.STATUS.DISABLED })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Refresh token fails */
            await request.get('/api/v1/tokens/refresh')
                .set('Authorization', userToken)
                .set('Accept', /application\/json/)
                .expect(401);

            /* Admin enables user */
            await request.patch(`/api/v1/users/${testUserId}`)
                .send({ status: CONSTANTS.STATUS.ACTIVE })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Refresh token works again */
            await request.get('/api/v1/tokens/refresh')
                .set('Authorization', userToken)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Logout */
            await request.post('/logout')
                .set('Cookie', userCookie)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Refresh token fails with user token */
            await request.get('/api/v1/tokens/refresh')
                .set('Authorization', userToken)
                .set('Accept', /application\/json/)
                .expect(401);

        });

    });

    describe('Basic Service Accounts', () => {

        const serviceAccountData = {
            username: 'service-account1@example.com',
            firstname: 'service',
            lastname: 'account',
            status: CONSTANTS.STATUS.ACTIVE,
            password: 'testpwd',
            // role: CONSTANTS.ROLES.SERVICE_ACCOUNT,
            permissions: [RESTRICTED_PERMISSIONS['all']],
        };

        const testUserData = {
            'username': 'testuser55@example.com',
            'firstname': 'test',
            'lastname': 'user',
            'status': 'ACTIVE',
            'password': 'usertest',
            // 'role': CONSTANTS.ROLES.USER,
        };

        test('ephemeral service account token is created', async () => {

            /* Create new user and a new service account */

            const createUserResponse = await request.post('/api/v1/users')
                .send(testUserData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const userId = createUserResponse.body.id;

            await request.post('/api/v1/users')
                .send(serviceAccountData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Log in as service account */
            const response = await request.post('/login')
                .send({
                    username: serviceAccountData.username,
                    password: serviceAccountData.password,
                })
                .set('Accept', /application\/json/)
                .expect(200);
            const serviceAccountToken = `Bearer ${response.body.token}`;

            /* Service account can create a ephemeral token for the given user id */
            const portTokenResponse = await request.post('/api/v1/tokens')
                .send({
                    accountId: userId,
                    expiresIn: '1h',
                    inquirer: new mongoose.Types.ObjectId(),
                })
                .set('Authorization', serviceAccountToken)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Service account can fetch user data */
            await request.get('/api/v1/users/me')
                .set('Authorization', `Bearer ${portTokenResponse.body.token}`)
                .set('Accept', /application\/json/)
                .expect(200);

        });

        test('permanent service account token is created', async () => {

            const userAccount = {
                'username': 'sa-persistent-token@example.com',
                'firstname': 'test',
                'lastname': 'user',
                'status': 'ACTIVE',
                'password': 'usertest',
                // 'role': CONSTANTS.ROLES.USER,
            };

            const userCreateResp = await request.post('/api/v1/users')
                .send(userAccount)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Service account can create a ephemeral token for the given user id */
            const portTokenResponse = await request.post('/api/v1/tokens')
                .send({
                    accountId: userCreateResp.body.id,
                    expiresIn: -1,
                })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            console.log(portTokenResponse.body);

            expect(portTokenResponse.body.token).toBeDefined();
            expect(portTokenResponse.body.id).toBeDefined();

            /* Repeat, should not create a duplicate */
            const portTokenResponse2 = await request.post('/api/v1/tokens')
                .send({
                    accountId: userCreateResp.body.id,
                    expiresIn: -1,
                })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            console.log(portTokenResponse2.body);

            expect(portTokenResponse2.body.token).toBeDefined();
            expect(portTokenResponse2.body.id).toBeDefined();

            const portTokenResponse3 = await request.get(`/api/v1/tokens?accountId=${userCreateResp.body.id}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            expect(portTokenResponse3.body.length).toEqual(1);

            /* Multiple different tokens possible */
            const portTokenResponse4 = await request.post('/api/v1/tokens')
                .send({
                    accountId: userCreateResp.body.id,
                    expiresIn: '2h',
                })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            console.log(portTokenResponse4.body);

            expect(portTokenResponse4.body.token).toBeDefined();
            expect(portTokenResponse4.body.id).toBeDefined();

            const portTokenResponse5 = await request.get(`/api/v1/tokens?accountId=${userCreateResp.body.id}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            expect(portTokenResponse5.body.length).toEqual(2);

        });

        test('ephemeral tokens are only created for existing users and valid params', async () => {

            /* Create new user and a new service account */

            const createUserResponse = await request.post('/api/v1/users')
                .send({
                    'username': 'testuser77@example.com',
                    'firstname': 'test',
                    'lastname': 'user',
                    'status': 'DISABLED',
                    'password': 'usertest',
                    'role': CONSTANTS.ROLES.USER,
                })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const userId = createUserResponse.body.id;

            /* User account is disabled */
            await request.post('/api/v1/tokens')
                .send({
                    accountId: userId,
                    expiresIn: '1h',
                })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(404);

            const createUserResponse2 = await request.post('/api/v1/users')
                .send({
                    'username': 'testuser79@example.com',
                    'firstname': 'test',
                    'lastname': 'user',
                    'status': 'ACTIVE',
                    'password': 'usertest',
                    'role': CONSTANTS.ROLES.USER,
                })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const userId2 = createUserResponse2.body.id;

            // /* Missing inquirer id */
            // await request.post('/api/v1/tokens')
            //     .send({
            //         accountId: userId2,
            //         expiresIn: '1h',
            //     })
            //     .set('Authorization', tokenAdmin)
            //     .set('Accept', /application\/json/)
            //     .expect(400);

        });

        test('ephemeral service account token can be introspected', async () => {

            /* Create new user and a new service account */
            const testUserData = {
                'username': 'testuser88@example.com',
                'firstname': 'test',
                'lastname': 'user',
                'status': 'ACTIVE',
                'password': 'usertest',
            };

            const serviceAccountData = {
                username: 'service-account22@example.com',
                firstname: 'service',
                lastname: 'account',
                status: CONSTANTS.STATUS.ACTIVE,
                password: 'testpwd',
                permissions: [RESTRICTED_PERMISSIONS['iam.token.create'], RESTRICTED_PERMISSIONS['iam.token.introspect']],
            };

            const createUserResponse = await request.post('/api/v1/users')
                .send(testUserData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const userId = createUserResponse.body.id;

            await request.post('/api/v1/users')
                .send(serviceAccountData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Log in as service account */
            const response = await request.post('/login')
                .send({
                    username: serviceAccountData.username,
                    password: serviceAccountData.password,
                })
                .set('Accept', /application\/json/)
                .expect(200);
            const serviceAccountToken = `Bearer ${response.body.token}`;

            /* Service account can create a ephemeral token for the given user id */
            const portTokenResponse = await request.post('/api/v1/tokens')
                .send({
                    accountId: userId,
                    expiresIn: '1h',
                    inquirer: new mongoose.Types.ObjectId(),
                })
                .set('Authorization', serviceAccountToken)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Service account can fetch user data */
            const tokenIntrospectResponse = await request.post('/api/v1/tokens/introspect')
                .send({
                    token: portTokenResponse.body.token,
                })
                .set('Authorization', serviceAccountToken)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(tokenIntrospectResponse.body.username).toEqual(testUserData.username);

            /* introspect fails for invalid tokens */
            await request.post('/api/v1/tokens/introspect')
                .send({
                    token: 'random-token',
                })
                .set('Authorization', serviceAccountToken)
                .set('Accept', /application\/json/)
                .expect(404);

        });

        test('deleted tokens cannot be used', async () => {

            const serviceAccountData = {
                username: 'service-account132@example.com',
                firstname: 'service',
                lastname: 'account',
                status: CONSTANTS.STATUS.ACTIVE,
                password: 'testpwd',
                // role: CONSTANTS.ROLES.SERVICE_ACCOUNT,
                permissions: [RESTRICTED_PERMISSIONS['iam.token.create'], RESTRICTED_PERMISSIONS['iam.token.introspect']],
            };

            const createUserResponse = await request.post('/api/v1/users')
                .send({
                    'username': 'testuser79898@example.com',
                    'firstname': 'test',
                    'lastname': 'user',
                    'status': 'ACTIVE',
                    'password': 'usertest',
                    'role': CONSTANTS.ROLES.USER,
                })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            const userId = createUserResponse.body.id;

            await request.post('/api/v1/users')
                .send(serviceAccountData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Log in as service account */
            const response = await request.post('/login')
                .send({
                    username: serviceAccountData.username,
                    password: serviceAccountData.password,
                })
                .set('Accept', /application\/json/)
                .expect(200);
            const serviceAccountToken = `Bearer ${response.body.token}`;

            /* Service account can create a ephemeral token for the given user id */
            const portTokenResponse = await request.post('/api/v1/tokens')
                .send({
                    accountId: userId,
                    expiresIn: '1h',
                    inquirer: new mongoose.Types.ObjectId(),
                })
                .set('Authorization', serviceAccountToken)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Service account fetch user data is successful */
            await request.get('/api/v1/users/me')
                .set('Authorization', `Bearer ${portTokenResponse.body.token}`)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Admin deletes the token */
            const tokenResp = await request.get(`/api/v1/tokens?token=${encodeURIComponent(portTokenResponse.body.token)}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Admin deletes the token */
            await request.delete(`/api/v1/tokens/${tokenResp.body[0]._id}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Admin deletes the token */
            await request.get(`/api/v1/tokens/${tokenResp.body[0]._id}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(404);

            /* Service account fetch user data fails */
            await request.get('/api/v1/users/me')
                .set('Authorization', `Bearer ${portTokenResponse.body.token}`)
                .set('Accept', /application\/json/)
                .expect(401);

        });

    });

});

describe('RSA Signing', () => {

    let app = null;
    let tokenAdmin;

    beforeAll(async (done) => {

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_AUTH_TYPE = 'basic';
        process.env.IAM_JWT_ALGORITHM_TYPE = CONSTANTS.JWT_ALGORITHMS.RSA;
        process.env.IAM_BASEURL = 'http://localhost';

        conf = require('../src/conf/index');
        conf.jwt.algorithmType = process.env.IAM_JWT_ALGORITHM_TYPE;
        conf.jwt.algorithm = 'RS256';
        const App = require('../src/app');
        app = new App({
            mongoConnection: global.__MONGO_URI__.replace('changeme', 'integration'),
        });
        await app.setup();
        await app.start();
        done();
    });

    afterAll(() => {
        app.stop();
    });

    describe('General Routes', () => {

        test('well-known endpoint provides jwks', async () => {
            const response = await request.get('/.well-known/jwks.json')
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response.body.keys.length).toBeGreaterThan(1);
        });

        test('login successful', async () => {
            const jsonPayload = {
                username: conf.accounts.admin.username,
                password: conf.accounts.admin.password,
            };
            const response = await request.post('/login')
                .send(jsonPayload)
                .set('Accept', /application\/json/)
                .expect(200);
            tokenAdmin = `Bearer ${response.body.token}`;

        });

        test('token verification is successful', async () => {

            await request.get('/api/v1/tokens/refresh')
                .set('Accept', /application\/json/)
                .set('Authorization', tokenAdmin)
                .expect(200);

        });
    });

    describe('Keystore', () => {

        test('keystore is generated if it do not exist', async () => {

            const keystore = require('../src/util/keystore');
            await keystore.deleteKeystore();

            const response = await request.get('/.well-known/jwks.json')
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response.body.keys.length).toBeGreaterThan(1);
        });
    });

});
