process.env.AUTH_TYPE = 'basic';
const request = require('supertest')('http://localhost:3099');

const CONSTANTS = require('../src/constants');

let conf = null;

describe('Tenant Routes', () => {
    let TenantID = null;
    const tenantKey = 'sshhhhhh';
    // Token will be set via Login and is valid 3h
    let tokenAdmin = null;
    let app = null;
    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_AUTH_TYPE = 'basic';
        conf = require('../src/conf/index');
        const App = require('../src/app');
        app = new App({
            mongoConnection: global.__MONGO_URI__.replace('changeme', 'tenants'),
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

            done();

        }, 200);

    });

    afterAll(() => {
        app.stop();
    });

    test('create tenant succeeds', async () => {
        const jsonPayload = {
            'name': 'testTenant',
            'confirmed': true,
            'status': CONSTANTS.STATUS.ACTIVE,
        };
        const response = await request.post('/api/v1/tenants')
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        TenantID = response.body.id;
    });

    test('create tenant key', async () => {
        const jsonPayload = {
            value: tenantKey,
        };
        await request.post(`/api/v1/tenants/${TenantID}/key`)
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .expect(200);
    });

    test('get tenant key', async () => {

        const { body } = await request.get(`/api/v1/tenants/${TenantID}/key`)
            .set('Authorization', tokenAdmin);
        expect(body.key).toEqual(tenantKey);
    });

    test('delete tenant key', async () => {

        await request.delete(`/api/v1/tenants/${TenantID}/key`)
            .set('Authorization', tokenAdmin)
            .expect(200);

        const { body } = await request.get(`/api/v1/tenants/${TenantID}/key`)
            .set('Authorization', tokenAdmin);
        expect(body.key).toEqual(null);
    });

    // test('create tenant fails for wrong or missing request body', async () => {
    //     const jsonPayload = {
    //     };
    //     const response = await request.post('/api/v1/tenants')
    //         .send(jsonPayload)
    //         .set('Authorization', tokenAdmin)
    //         .set('Accept', /application\/json/);
    //     expect(response.statusCode).toBe(400);
    // });

    test('get all tenants is successful', async () => {
        const response = await request.get('/api/v1/tenants')
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .expect(200);
        expect(response.body.length).not.toBe(0);
        expect(response.body[0].name).toBe('testTenant');
    });

    test('get all tenants is successful with meta format', async () => {
        const response = await request.get('/api/v1/tenants')
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .query({ meta: true })
            .expect(200);
        expect(response.body.data.length).not.toBe(0);
        expect(response.body.data[0].name).toBe('testTenant');
        expect(response.body.meta.total).not.toBe(0);
    });

    test('get all tenants without Token', async () => {
        await request.get('/api/v1/tenants')
            .set('Accept', /application\/json/)
            .expect(401);
    });

    test('get specific tenant successful', async () => {
        const response = await request.get(`/api/v1/tenants/${TenantID}`)
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .expect(200);
        expect(response.body).toBeDefined();
        expect(response.body._id).toBe(TenantID);
    });

    test('unauthorized access of a tenant route is not allowed', async () => {
        await request.get(`/api/v1/tenants/${TenantID}`)
            .set('Accept', /application\/json/)
            .expect(401);
    });

    test('get all tenant users is successful', async () => {
        const response = await request.get(`/api/v1/tenants/${TenantID}/users`)
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .expect(200);
        expect(response.body.length).toBe(0);
    });

    test('patch modifying a specific tenant is successful', async () => {
        const jsonPayload = {
            'name': 'testTenant12',
        };
        await request.patch(`/api/v1/tenants/${TenantID}`)
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const response = await request.get(`/api/v1/tenants/${TenantID}`)
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin);
        expect(response.body.name).toBe(jsonPayload.name);
    });

    test('put modifying a specific tenant is successful', async () => {
        const jsonPayload = {
            'name': 'testTenant22',
            'confirmed': false,
            'status': CONSTANTS.STATUS.DISABLED,
        };
        await request.put(`/api/v1/tenants/${TenantID}`)
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const response = await request.get(`/api/v1/tenants/${TenantID}`)
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin);
        const { name, status, confirmed } = response.body;
        expect({ name, status, confirmed }).toEqual(jsonPayload);

    });

    test('tenant delete successful', async () => {

        const responseID = await request.del(`/api/v1/tenants/${TenantID}`)
            .set('Authorization', tokenAdmin);
        expect(responseID.statusCode).toBe(200);
    });

    test('tenant delete with an incorrect id throws an error', async () => {
        const response = await request.del('/api/v1/tenants/123')
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/);
        expect(response.statusCode).toBe(500);
    });

});
