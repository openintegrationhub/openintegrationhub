/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Sets the environment variables for the iam middleware.
// This has to happen before server.js is required
process.env.IAM_UPDATE_USERDATA = false;
process.env.IAM_JWT_ISSUER = 'Test_Issuer';
process.env.IAM_JWT_AUDIENCE = 'Test_Audience';
process.env.IAM_JWT_HMAC_SECRET = 'Test_Secret';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3001;
const request = require('supertest')(`${hostUrl}:${port}`);

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line


const adminId = 'TestAdmin';
const guestId = 'TestGuest';

const now = Math.round(new Date().getTime() / 1000);

// Creates two user objects that will be used as payloads for the authorisation tokens
const adminUser = {
  sub: adminId,
  username: 'admin@example.com',
  role: 'ADMIN',
  memberships: [
    {
      role: 'TENANT_ADMIN',
      tenant: 'testTenant1',
    },
    {
      role: 'TENANT_ADMIN',
      tenant: 'testTenant2',
    },
  ],
  iat: now,
  exp: now + 1000,
  aud: 'Test_Audience',
  iss: 'Test_Issuer',
};

const guestUser = {
  sub: guestId,
  username: 'admin@example.com',
  role: 'GUEST',
  memberships: [
    {
      role: 'TENANT_Guest',
      tenant: 'testTenant1',
    },
  ],
  iat: now,
  exp: now + 1000,
  aud: 'Test_Audience',
  iss: 'Test_Issuer',
};

// Converts the payloads into json web tokens
const adminToken = jwt.sign(adminUser, 'Test_Secret');
const guestToken = jwt.sign(guestUser, 'Test_Secret');
let flowId1;
let flowId2;
let app;

beforeAll(async () => {
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();
});

afterAll(async () => {
  mongoose.connection.db.dropDatabase();
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
    const res = await request.get('/flows/');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toEqual('Missing authorization header.');
  });

  test('should not be able to get specific flows without login', async () => {
    const res = await request.get('/flows/TestOIHID/');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toEqual('Missing authorization header.');
  });

  test('should not be able to add flows without login', async () => {
    const res = await request
      .post('/flows/')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        oihid: 'TestOIHID',
        name: 'WiceToSnazzy',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
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
        .post('/flows/')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          type: 'flow',
          name: 'WiceToSnazzy',
          status: 'active',
          current_status: 'active',
          default_mapper_type: 'jsonata',
          description: 'A description',
        });

      expect(res.status).toEqual(201);
      expect(res.text).not.toHaveLength(0);
      const j = JSON.parse(res.text);
      expect(j).not.toBeNull();

      expect(j).toHaveProperty('oihid');
      flowId1 = j.oihid;
    } catch (e) {
      log.error(e);
    }
  });


  test('should get the new flow', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j).toHaveProperty('oihid');
  });

  test('should not show the flow to another users getAll', async () => {
    const res = await request
      .get('/flows/')
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });

  test('should not show the flow to another users get', async () => {
    const res = await request
      .get('/flows/TestOIHID')
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });

  test('should return 404 when getting a non-existent flow', async () => {
    const res = await request
      .get('/flows/nothing')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });

  test('should add a second flow', async () => {
    const res = await request
      .post('/flows/')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'SnazzyZoWice',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();

    expect(j).toHaveProperty('oihid');
    flowId2 = j.oihid;
  });

  test('should get all flows', async () => {
    const res = await request
      .get('/flows/')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(2);
    expect(j.data[0]).toHaveProperty('oihid');
  });


  test('should update flow', async () => {
    const res = await request
      .patch(`/flows/${flowId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        oihid: flowId1,
        name: 'NewName',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      });
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();

    expect(j).toHaveProperty('oihid');
  });

  test('should not be able to update a non-existent flow', async () => {
    const res = await request
      .patch('/flows/NonExistentFlow')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        oihid: 'nothing',
        name: 'NewName',
        status: 'active',
        current_status: 'active',
        default_mapper_type: 'jsonata',
        description: 'A description',
      });
    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('Flow not found');
  });
});

describe('Cleanup', () => {
  test('should delete the first flow', async () => {
    const res = await request
      .delete(`/flows/${flowId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('Flow was successfully deleted');
  });

  test('should delete the second flow', async () => {
    const res = await request
      .delete(`/flows/${flowId2}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('Flow was successfully deleted');
  });

  test('should return 404 when attempting to get the just deleted flow', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toEqual(404);
    expect(res.text).not.toBeNull();
    expect(res.text).toEqual('No flows found');
  });
});
