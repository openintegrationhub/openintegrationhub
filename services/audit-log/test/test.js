/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3007;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock');
const token = require('./utils/tokens');
const { saveLog, gdprAnonymise } = require('../app/api/utils/handlers');
const Log = require('../app/models/log');
const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;
let app;

const log1 = {
    headers: {
        name: 'iam.user.created',
        serviceName: 'iam',
        createdAt: '1563959057790',
    },
    payload: {
        id: 'abcdef12345',
        username: 'test@org.de',
    },
};

const log2 = {
    headers: {
        name: 'flowrepo.flow.created',
        serviceName: 'flow-repository',
        createdAt: '1563959094720',
    },
    payload: {
        flowId: 'dhi38fj3oz9fj3',
        tenant: 'TestTenant',
    },
};

const log3 = {
    headers: {
        name: 'flowrepo.flow.started',
        serviceName: 'flow-repository',
        createdAt: '1563994057792',
    },
    payload: {
        user: 'abcdef12345',
        flowId: 'dhi38fj3oz9fj3',
    },
};

beforeAll(async () => {
    iamMock.setup();
    mainServer.setupMiddleware();
    mainServer.setupRoutes();
    mainServer.setupSwagger();
    await mainServer.setup(mongoose);
    app = mainServer.listen();
    await saveLog(log1);
    await saveLog(log2);
});

afterAll(async () => {
    mongoose.connection.close();
    app.close();
});

describe('Documentation', () => {
    test('should display the swagger-generated HTML page', async () => {
        const res = await request.get('/api-docs/');
        expect(res.text).not.toHaveLength(0);
        expect(res.text).toMatch(/HTML for static distribution bundle build/);
    });
});

describe('Login Security', () => {
    test('should not be able to get logs without login', async () => {
        const res = await request.get('/logs');
        expect(res.status).toEqual(401);
        expect(res.text).not.toHaveLength(0);
        expect(res.body.errors).toHaveLength(1);
        expect(res.body.errors[0].message).toEqual('Missing authorization header.');
    });

    test('should not be able to HTTP POST logs without login', async () => {
        const res = await request.post('/logs');
        expect(res.status).toEqual(401);
        expect(res.body.errors).toHaveLength(1);
        expect(res.body.errors[0].message).toEqual('Missing authorization header.');
    });
});

describe('Log Operations', () => {
    test('should manually post a log', async () => {
        const res = await request
            .post('/logs')
            .set('Authorization', 'Bearer adminToken')
            .send(log3);

        expect(res.status).toEqual(201);
        expect(res.text).not.toBeNull();
    });

    test('should get all logs', async () => {
        const res = await request
            .get('/logs')
            .query({
                'page[size]': 5,
                'page[number]': 1,
            })
            .set('Authorization', 'Bearer adminToken');

        expect(res.status).toEqual(200);
        expect(res.text).not.toBeNull();
        const j = JSON.parse(res.text);

        expect(j).not.toBeNull();
        expect(j.data).toHaveLength(3);
        expect(j.data[0]).toHaveProperty('_id');
    });

    test('should get all logs, restricted by user/tenant', async () => {
        const res = await request
            .get('/logs')
            .query({
                'page[size]': 5,
                'page[number]': 1,
            })
            .set('Authorization', 'Bearer userToken');

        expect(res.status).toEqual(200);
        expect(res.text).not.toBeNull();
        const j = JSON.parse(res.text);

        expect(j).not.toBeNull();
        expect(j.data).toHaveLength(1);
        expect(j.data[0]).toHaveProperty('_id');
        expect(j.data[0].payload.tenant).toEqual('TestTenant');
    });

    test('should get all logs, filtered by service', async () => {
        const res = await request
            .get('/logs')
            .query({
                'page[size]': 5,
                'page[number]': 1,
                'filter[service]': 'iam',
            })
            .set('Authorization', 'Bearer adminToken');

        expect(res.status).toEqual(200);
        expect(res.text).not.toBeNull();
        const j = JSON.parse(res.text);

        expect(j).not.toBeNull();
        expect(j.data).toHaveLength(1);
        expect(j.data[0]).toHaveProperty('_id');
        expect(j.data[0].headers.serviceName).toEqual('iam');
    });

    test('should get all logs, filtered by tenant', async () => {
        const res = await request
            .get('/logs')
            .query({
                'page[size]': 5,
                'page[number]': 1,
                'filter[tenant]': 'TestTenant',
            })
            .set('Authorization', 'Bearer adminToken');

        expect(res.status).toEqual(200);
        expect(res.text).not.toBeNull();
        const j = JSON.parse(res.text);

        expect(j).not.toBeNull();
        expect(j.data).toHaveLength(1);
        expect(j.data[0]).toHaveProperty('_id');
        expect(j.data[0].payload.tenant).toEqual('TestTenant');
    });

    test('should get all logs, filtered by name', async () => {
        const res = await request
            .get('/logs')
            .query({
                'page[size]': 5,
                'page[number]': 1,
                'filter[name]': 'iam.user.created',
            })
            .set('Authorization', 'Bearer adminToken');

        expect(res.status).toEqual(200);
        expect(res.text).not.toBeNull();
        const j = JSON.parse(res.text);

        expect(j).not.toBeNull();
        expect(j.data).toHaveLength(1);
        expect(j.data[0]).toHaveProperty('_id');
        expect(j.data[0].payload.username).toEqual('test@org.de');
    });

    test('should find no logs when filtering over an absent attribute', async () => {
        const res = await request
            .get('/logs')
            .query({
                'page[size]': 5,
                'page[number]': 1,
                'filter[keks]': 'Schokorosine',
            })
            .set('Authorization', 'Bearer adminToken');

        expect(res.status).toEqual(200);
        expect(res.text).not.toBeNull();
        expect(res.body.data).toHaveLength(0);
    });

    test('should find no logs when filtering over an absent attribute', async () => {
        const res = await request
            .get('/logs')
            .query({
                'page[size]': 5,
                'page[number]': 1,
                'filter[keks]': 'Schokorosine',
            })
            .set('Authorization', 'Bearer adminToken');

        expect(res.status).toEqual(200);
        expect(res.text).not.toBeNull();
        expect(res.body.data).toHaveLength(0);
    });

    test('should anonymyse a user', async () => {
        await gdprAnonymise('abcdef12345');

        const logs = await Log.find().lean();

        expect(logs[0].payload.id).toEqual('XXXXXXXXXX');
        expect(logs[0].payload.username).toEqual('XXXXXXXXXX');
        expect(logs[2].payload.user).toEqual('XXXXXXXXXX');
    });
});
