process.env.AUTH_TYPE = 'basic';
const request = require('supertest')('http://localhost:3099');

let conf = null;

describe('Tenant Routes', () => {
    // Token will be set via Login and is valid 3h
    let tokenAdmin = null;
    let app = null;
    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_AUTH_TYPE = 'basic';
        conf = require('../src/conf/index');
        const App = require('../src/app');
        app = new App({
            mongoConnection: global.__MONGO_URI__.replace('changeme', 'permissions'),
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

    test('get all permissions is successful', async () => {
        const response = await request.get('/api/v1/permissions')
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .expect(200);
        expect(response.body.length).not.toBe(0);
    });

    test('get all tenants without Token', async () => {
        await request.get('/api/v1/permissions')
            .set('Accept', /application\/json/)
            .expect(401);
    });

});
