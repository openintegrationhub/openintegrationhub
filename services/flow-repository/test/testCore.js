/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3001;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock.js');
const token = require('./utils/tokens');
const { reportHealth } = require('../app/utils/publish');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line


const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let flowId1;
let flowId2;
let app;

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();
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
  test('should not be able to get flows without login', async () => {
    const res = await request.get('/flows');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toEqual('Missing authorization header.');
  });

  test('should not be able to get specific flows without login', async () => {
    const res = await request.get('/flows/123456789012');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toEqual('Missing authorization header.');
  });

  test('should not be able to add flows without login', async () => {
    const res = await request
      .post('/flows')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'WiceToSnazzy',
        status: 'active',
        description: 'A description',
      });
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toEqual('Missing authorization header.');
  });

  test('should not be able to delete flows without login', async () => {
    const res = await request
      .delete('/flows/TestOIHID')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toEqual('Missing authorization header.');
  });
});


describe('Flow Operations', () => {
  test('should add a flow', async () => {
    try {
      const res = await request
        .post('/flows')
        .set('Authorization', 'Bearer adminToken')
        .set('accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          type: 'ordinary',
          name: 'WiceToSnazzy',
          status: 'active',
          description: 'A description',
        });
      expect(res.status).toEqual(201);
      expect(res.text).not.toHaveLength(0);
      const j = JSON.parse(res.text);
      expect(j).not.toBeNull();

      expect(j).toHaveProperty('_id');
      flowId1 = j._id;
    } catch (e) {
      log.error(e);
    }
  });


  test('should get the new flow', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken');
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.name).toEqual('WiceToSnazzy');
    expect(j).toHaveProperty('_id');
    expect(j).toHaveProperty('graph');
    expect(j.graph).toHaveProperty('nodes');
    expect(j.graph).toHaveProperty('edges');
    expect(j.owners[0].id).toEqual('TestAdmin');
    expect(j.owners[0].type).toEqual('user');
  });

  test('should not show the flow to another users getAll', async () => {
    const res = await request
      .get('/flows/')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });

  test('should not show the flow to another users get', async () => {
    const res = await request
      .get('/flows/123456789012')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });

  test('should return 400 when attempting to get an invalid id', async () => {
    const res = await request
      .get('/flows/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.text).not.toBeNull();
  });

  test('should return 404 when getting a non-existent flow', async () => {
    const res = await request
      .get('/flows/123456789012')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });

  test('should add a second flow', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'long_running',
        name: 'SnazzyZoWice',
        status: 'active',
        description: 'Different content',
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();

    expect(j).toHaveProperty('_id');
    flowId2 = j._id;
  });

  test('should get all flows, filtered by status', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[status]': 1,
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(2);
    expect(j.data[0]).toHaveProperty('_id');
  });

  test('should get all flows, filtered by user', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[user]': guestId,
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
  });

  test('should get all flows, filtered by type', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[type]': 'ordinary',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
  });

  test('should get all flows, using a search', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        search: 'desc',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
  });


  test('should update flow', async () => {
    const res = await request
      .patch(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'NewName',
        status: 'active',
        description: 'A description',
        owners: [
          {
            type: 'user',
            id: 'dude',
          },
        ],
      });
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();

    expect(j).toHaveProperty('_id');
  });

  test('should start a flow', async () => {
    const res = await request
      .post(`/flows/${flowId1}/start`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j).toHaveProperty('headers');
    expect(j).toHaveProperty('payload');
    expect(j.headers.name).toEqual('flow.starting');
    expect(j.payload.status).toEqual('active');
  });

  test('should stop a flow', async () => {
    const res = await request
      .post(`/flows/${flowId1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j).toHaveProperty('headers');
    expect(j).toHaveProperty('payload');
    expect(j.headers.name).toEqual('flow.stopping');
    expect(j.payload.status).toEqual('inactive');
  });

  test('should return 400 when attempting to update an invalid id', async () => {
    const res = await request
      .patch('/flows/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.text).not.toBeNull();
  });

  test('should not be able to update a non-existent flow', async () => {
    const res = await request
      .patch('/flows/123456789012')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'NewName',
        status: 'active',
        description: 'A description',
      });
    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('Flow not found');
  });
});

describe('Cleanup', () => {
  test('should return 400 when attempting to delete an invalid id', async () => {
    const res = await request
      .delete('/flows/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.text).not.toBeNull();
  });

  test('should delete the first flow', async () => {
    const res = await request
      .delete(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('Flow was successfully deleted');
  });

  test('should delete the second flow', async () => {
    const res = await request
      .delete(`/flows/${flowId2}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('Flow was successfully deleted');
  });

  test('should return 404 when attempting to get the just deleted flow', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken');
    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });
});
