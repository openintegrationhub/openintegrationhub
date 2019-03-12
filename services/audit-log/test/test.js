/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3007;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock.js');
const token = require('./utils/tokens');
const validator = require('../app/api/utils/validator.js');
const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;
let app;

const log1 = {
  service: 'SomeService',
  timeStamp: '1234',
  nameSpace: 'innerSpace',
  payload: {
    tenant: '1',
    source: '200',
    object: 'x',
    action: 'noaction',
    subject: 'Test subject',
    details: 'Here goes the description.',
  },
};

const log2 = {
  service: 'SomeOtherService',
  timeStamp: '1235',
  nameSpace: 'outerSpace',
  payload: {
    tenant: '2',
    source: '400',
    object: 'y',
    action: 'noaction',
    subject: 'Test subject',
    details: 'Here goes a completely different description.',
  },
};

const log3 = {
  service: 'YetAnotherService',
  timeStamp: '1236',
  nameSpace: 'warpSpace',
  payload: {
    tenant: '4',
    source: '400',
    object: 'y',
    action: 'noaction',
    subject: 'Test subject',
    details: 'This is not actually a description.',
  },
};


const invalidSchema = {
  service: 'InvalidService',
  timeSagagtamp: '1236',
  payload: {
    tenant: '4',
    source: '400',
    additionalKey: 'ADBljhasf',
    object: 'y',
    action: 'noaction',
    subject: 'Test subject',
    details: 'This should be refused by the validator.',
  },
};

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  await mainServer.setup(mongoose);
  app = mainServer.listen();
  // Pass on messages to the validator as if they had been received by the receive module
  await validator.validate(log1);
  await validator.validate(log2);
  await validator.validate(invalidSchema);
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
    expect(res.text).toEqual('Missing authorization header.');
  });

  test('should not be able to HTTP POST logs without login', async () => {
    const res = await request.post('/logs');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toEqual('Missing authorization header.');
  });
});


describe('Log Operations', () => {
  test('should manually post a log', async () => {
    const res = await request
      .post('/logs')
      .set('Authorization', 'Bearer adminToken')
      .send(log3);

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
  });

  test('should get all logs for an admin', async () => {
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

  test('should not show the logs to a user whose tenant has no logs', async () => {
    const res = await request
      .get('/logs')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No logs found');
  });

  test('should show only logs of the same tenant to a user', async () => {
    const res = await request
      .get('/logs')
      .set('Authorization', 'Bearer userToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
    expect(j.data[0].service).toEqual('SomeOtherService');
  });

  test('should get all logs, filtered by tenant', async () => {
    const res = await request
      .get('/logs')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[tenant]': '1',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
    expect(j.data[0].service).toEqual('SomeService');
  });

  test('should get all logs, filtered by service', async () => {
    const res = await request
      .get('/logs')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[service]': 'SomeOtherService',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
    expect(j.data[0].service).toEqual('SomeOtherService');
  });

  test('should get all logs, filtered by namespace', async () => {
    const res = await request
      .get('/logs')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[nameSpace]': 'warpSpace',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
    expect(j.data[0].service).toEqual('YetAnotherService');
  });

  test('should get all logs, with a search', async () => {
    const res = await request
      .get('/logs')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        search: 'actually',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
    expect(j.data[0].service).toEqual('YetAnotherService');
  });
});
