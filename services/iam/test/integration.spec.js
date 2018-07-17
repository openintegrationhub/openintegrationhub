process.env.AUTH_TYPE = 'basic';
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;

const mockgoose = new Mockgoose(mongoose);
const request = require('supertest')('http://localhost:3099');
const CONSTANTS = require('./../src/constants');

let conf = null;

// Token will be set via Login and is valid 3h
let tokenAdmin = null;
describe('routes', () => {
    let app = null;
    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_BASEURL = 'http://localhost';
        conf = require('./../src/conf/index');
        const App = require('../src/app'); 
        app = new App();
        await mockgoose.prepareStorage();
        await app.setup(mongoose);
        await app.start();
        done();
    });

    afterAll(() => {
        app.stop(); 
    });
    
    describe('General Routes', () => {

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

        test('logout is successful', async () => {
            await request.post('/logout')
                .set('Accept', /application\/json/)
                .expect(200);
    
        });

        test('get redirect for error call', async () => {
            await request.get('/')
                .expect(200);
        });

        test('healthcheck', async () => {
            await request.get('/healthcheck')
                .set('Accept', /application\/json/)
                .expect(200);
            // expect(response.body).toBe(0);
    
        });
    });

    describe('Integration between all Routes', () => {
        let testUser = null;
        let TenantID = null;

        const testUserData = {
            'username': 'blubb@basaas.com',
            'firstname': 'blubb',
            'lastname': 'blubb',
            'status': 'ACTIVE',
            'password': 'blubb',
            'role': CONSTANTS.ROLES.USER,
        };

        test('User is successfully created', async () => {
            const response = await request.post('/api/v1/users')
                .send(testUserData)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            testUser = response.body.id;
        });

        test('Tenant is successfully created', async () => {
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
        });

        test('User is assigned to tenant', async () => {
            const jsonPayload = {
                'user': testUser,
                'role': CONSTANTS.MEMBERSHIP_ROLES.TENANT_GUEST,
            };
            const response = await request.post(`/api/v1/tenants/${TenantID}/users`)
                .send(jsonPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response.body._id).toBe(testUser);
        });

        test('Tenant users are returned', async () => {

            const response = await request.get(`/api/v1/tenants/${TenantID}/users`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response.body[0].username).toBe(testUserData.username);
            expect(response.body[0].memberships.length).toBe(1);
        });

        test('User is re-assigned to tenant with new role', async () => {

            const responseOldRole = await request.get(`/api/v1/tenants/${TenantID}/users`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(responseOldRole.body[0].memberships.length).toBe(1);
            expect(responseOldRole.body[0].memberships[0].role).toBe(CONSTANTS.MEMBERSHIP_ROLES.TENANT_GUEST);

            const jsonPayload = {
                'user': testUser,
                'role': CONSTANTS.MEMBERSHIP_ROLES.TENANT_DEVELOPER,
            };

            const response = await request.post(`/api/v1/tenants/${TenantID}/users`)
                .send(jsonPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response.body._id).toBe(testUser);

            const responseNewRole = await request.get(`/api/v1/tenants/${TenantID}/users`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(responseNewRole.body[0].memberships.length).toBe(1);
            expect(responseNewRole.body[0].memberships[0].role).toBe(jsonPayload.role);

        });

        test('tenant can be edited by tenant admin', async () => {

            const loginResponse = await request.post('/login')
                .send({
                    username: testUserData.username,
                    password: testUserData.password,
                })
                .set('Accept', /application\/json/);

            const userToken = loginResponse.body.token;

            // normal user is not allowed to modify tenant
            await request.patch(`/api/v1/tenants/${TenantID}`)
                .send({
                    name: 'new-tenant-name-2',
                })
                .set('Authorization', `Bearer ${userToken}`)
                .set('Accept', /application\/json/)
                .expect(403);

            const jsonPayload = {
                'user': testUser,
                'role': CONSTANTS.MEMBERSHIP_ROLES.TENANT_ADMIN,
            };

            // modify user role to TENANT_ADMIN
            await request.post(`/api/v1/tenants/${TenantID}/users`)
                .send(jsonPayload)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const fetchNewTokenResp = await request.get('/token')
                .set('Accept', /application\/json/)
                .set('Authorization', `Bearer ${userToken}`);

            const newToken = fetchNewTokenResp.body.token;

            // user can now edit the tenant
            await request.patch(`/api/v1/tenants/${TenantID}`)
                .send({
                    name: 'new-tenant-name-2',
                })
                .set('Authorization', `Bearer ${newToken}`)
                .set('Accept', /application\/json/)
                .expect(200);

        });

        test('User is unassigned from tenant', async () => {

            await request.delete(`/api/v1/tenants/${TenantID}/user/${testUser}`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            const response2 = await request.get(`/api/v1/tenants/${TenantID}/users`)
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response2.body.length).toBe(0);

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
            'role': CONSTANTS.ROLES.USER,
        };

        test('get token fails if user is logged out', async () => {

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
            await request.get('/token')
                .set('Cookie', userCookie)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Logout */
            await request.post('/logout')
                .set('Cookie', userCookie)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Refresh token fails */
            await request.get('/token')
                .set('Cookie', userCookie)
                .set('Accept', /application\/json/)
                .expect(401);

            /* Refresh token success with user token */
            await request.get('/token')
                .set('Authorization', userToken)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Admin disables user */
            await request.patch(`/api/v1/users/${testUserId}`)
                .send({ status: CONSTANTS.STATUS.DISABLED })
                .set('Authorization', tokenAdmin)
                .set('Accept', /application\/json/)
                .expect(200);

            /* Refresh token fails with user token */
            await request.get('/token')
                .set('Authorization', userToken)
                .set('Accept', /application\/json/)
                .expect(403);

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

        conf = require('./../src/conf/index');
        conf.jwt.algorithmType = process.env.IAM_JWT_ALGORITHM_TYPE;
        conf.jwt.algorithm = 'RS256';
        const App = require('../src/app');
        app = new App();
        await mockgoose.prepareStorage();
        await app.setup(mongoose);
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

            await request.get('/token')
                .set('Accept', /application\/json/)
                .set('Authorization', tokenAdmin)
                .expect(200);

        });
    });

    describe('Keystore', () => {

        test('keystore is generated if it do not exist', async () => {

            const keystore = require('./../src/util/keystore');
            await keystore.deleteKeystore();

            const response = await request.get('/.well-known/jwks.json')
                .set('Accept', /application\/json/)
                .expect(200);
            expect(response.body.keys.length).toBeGreaterThan(1);
        });
    });

});
