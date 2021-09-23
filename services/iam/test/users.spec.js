process.env.AUTH_TYPE = 'basic';
const request = require('supertest')('http://localhost:3099');

const CONSTANTS = require('../src/constants');

let conf = null;

describe('User Routes', () => {
    const testUser = {
        id: '',
        username: 'blubb@exmaple.com',
        password: 'blubb',
    };
    let tokenUser = null;

    // Token will be set via Login and is valid 3h
    let tokenAdmin = null;
    let app = null;
    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_AUTH_TYPE = 'basic';
        conf = require('../src/conf/index');
        const App = require('../src/app');
        app = new App({
            mongoConnection: global.__MONGO_URI__.replace('changeme', 'users'),
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

    test('get all users is successful', async () => {
        const response = await request.get('/api/v1/users')
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .expect(200);
        expect(response.body.length).not.toBe(0);
        expect(response.body[0].firstname).toBe(conf.accounts.admin.firstname);
    });

    test('get all users is successful with meta format', async () => {
        const response = await request.get('/api/v1/users')
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .query({ meta: true })
            .expect(200);
        expect(response.body.data.length).not.toBe(0);
        expect(response.body.data[0].firstname).toBe(conf.accounts.admin.firstname);
        expect(response.body.meta.total).not.toBe(0);
    });

    test('get all users without a valid token fails', async () => {
        await request.get('/api/v1/users')
            .set('Accept', /application\/json/)
            .expect(401);
    });

    test('user is successfully created', async () => {
        const jsonPayload = {
            'username': testUser.username,
            'firstname': 'blubb',
            'lastname': 'blubb',
            'status': 'ACTIVE',
            'password': testUser.password,
            'role': CONSTANTS.ROLES.USER,
        };
        const response = await request.post('/api/v1/users')
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        testUser.id = response.body.id;
    });

    test('create user with invalid body fails', async () => {
        const jsonPayload = {
            'firstname': 'blubb',
            'lastname': 'blubb',
            'status': 'ACTIVE',
            'password': 'blubb',
            'role': CONSTANTS.ROLES.USER,
        };
        const response = await request.post('/api/v1/users')
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(CONSTANTS.ERROR_CODES.INPUT_INVALID);

    });

    test('current user is returned if logged in', async () => {
        const response = await request.get('/api/v1/users/me')
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .expect(200);
        expect(response.body).toBeDefined();
        expect(response.body.username).toBe(conf.accounts.admin.username);

        await request.get('/api/v1/users/me')
            .set('Accept', /application\/json/)
            .expect(401);
    });

    test('get specific User successful', async () => {
        const response = await request.get(`/api/v1/users/${testUser.id}`)
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin)
            .expect(200);
        expect(response.body).toBeDefined();
        expect(response.body.username).toBe(testUser.username);
    });

    test('patch modify a specific user', async () => {
        const jsonPayload = {
            'firstname': 'blubb1',
            'lastname': 'blubb1',
            'status': 'ACTIVE',
            'role': CONSTANTS.ROLES.USER,
        };
        await request.patch(`/api/v1/users/${testUser.id}`)
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const response = await request.get(`/api/v1/users/${testUser.id}`)
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin);
        expect(response.body.username).toBe(testUser.username);
        expect(response.body.firstname).toBe(jsonPayload.firstname);
        expect(response.body.lastname).toBe(jsonPayload.lastname);
    });

    test('put modify a specific User successful', async () => {
        const jsonPayload = {
            'username': testUser.username,
            'firstname': 'blubb2',
            'lastname': 'blubb2',
            'status': CONSTANTS.STATUS.ACTIVE,
            'password': testUser.password,
            'role': CONSTANTS.ROLES.USER,
        };
        await request.put(`/api/v1/users/${testUser.id}`)
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const response = await request.get(`/api/v1/users/${testUser.id}`)
            .set('Accept', /application\/json/)
            .set('Authorization', tokenAdmin);
        const { username, status, firstname } = response.body;
        expect(jsonPayload).toMatchObject({ username, status, firstname });
    });

    test('reset user password is successful', async () => {
        const jsonPayload = {
            'password': 'blubb2',
        };

        testUser.password = jsonPayload.password;

        await request.patch(`/api/v1/users/${testUser.id}`)
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const response = await request.post('/login')
            .send({
                username: testUser.username,
                password: jsonPayload.password,
            })
            .set('Accept', /application\/json/)
            .expect(200);
        tokenUser = `Bearer ${response.body.token}`;
    });

    test('user cannot modify other users', async () => {

        const jsonPayload = {
            'username': 'yetnaotheruser@example.com',
            'firstname': 'test',
            'lastname': 'user',
            'status': CONSTANTS.STATUS.ACTIVE,
            'password': 'random',
            'role': CONSTANTS.ROLES.USER,
        };
        const response = await request.post('/api/v1/users')
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);
        const testUserId = response.body.id;

        await request.patch(`/api/v1/users/${testUserId}`)
            .send(jsonPayload)
            .set('Authorization', tokenUser)
            .set('Accept', /application\/json/)
            .expect(403);
    });

    test('disabled user cannot log in', async () => {

        const jsonPayload = {
            'username': 'yetnaotheruser2@example.com',
            'firstname': 'test',
            'lastname': 'user',
            'status': CONSTANTS.STATUS.DISABLED,
            'password': 'random',
            'role': CONSTANTS.ROLES.USER,
        };

        // create new user
        await request.post('/api/v1/users')
            .send(jsonPayload)
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/)
            .expect(200);

        const response = await request.post('/login')
            .send({
                username: jsonPayload.username,
                password: jsonPayload.password,
            })
            .set('Accept', /application\/json/)
            .expect(401);
        expect(response.body.message).toBe(CONSTANTS.ERROR_CODES.ENTITY_DISABLED);
    });

    test('user delete successful', async () => {

        const responseID = await request.del(`/api/v1/users/${testUser.id}`)
            .set('Authorization', tokenAdmin);
        expect(responseID.statusCode).toBe(200);
    });

    test('user delete with wrong id throws an exception', async () => {
        const response = await request.del('/api/v1/users/123')
            .set('Authorization', tokenAdmin)
            .set('Accept', /application\/json/);
        expect(response.statusCode).toBe(500);
    });
});
