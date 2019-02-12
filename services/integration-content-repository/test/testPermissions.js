/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Enables use of permission system
process.env.USE_PERMISSIONS = true;

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

const permittedId = 'PermitGuy';
const unpermittedId = 'UnpermitGuy';
const partpermittedId = 'PartpermitGuy';

const now = Math.round(new Date().getTime() / 1000);

// Creates two user objects that will be used as payloads for the authorisation tokens
const permittedUser = {
  sub: permittedId,
  username: 'admin@example.com',
  role: 'GUEST',
  permissions: ['flows.read', 'flows.write'],
  memberships: [
    {
      role: 'TENANT_ADMIN',
      tenant: 'testTenant1',
      permissions: ['flows.read', 'flows.write'],
    },
    {
      role: 'TENANT_ADMIN',
      tenant: 'testTenant2',
      permissions: ['flows.read', 'flows.write'],
    },
  ],
  iat: now,
  exp: now + 1000,
  aud: 'Test_Audience',
  iss: 'Test_Issuer',
};

const unpermittedUser = {
  sub: unpermittedId,
  username: 'guest@example.com',
  role: 'GUEST',
  permissions: ['schoko.riegel'],
  memberships: [
    {
      role: 'TENANT_Guest',
      tenant: 'testTenant1',
      permissions: ['müsli.riegel'],
    },
  ],
  iat: now,
  exp: now + 1000,
  aud: 'Test_Audience',
  iss: 'Test_Issuer',
};

const partpermittedUser = {
  sub: partpermittedId,
  username: 'guest@example.com',
  role: 'GUEST',
  permissions: ['schoko.riegel'],
  memberships: [
    {
      role: 'TENANT_Guest',
      tenant: 'testTenant1',
      permissions: ['flows.read'],
    },
  ],
  iat: now,
  exp: now + 1000,
  aud: 'Test_Audience',
  iss: 'Test_Issuer',
};


// Converts the payloads into json web tokens
const permitToken = jwt.sign(permittedUser, 'Test_Secret');
const unpermitToken = jwt.sign(unpermittedUser, 'Test_Secret');
const partpermitToken = jwt.sign(partpermittedUser, 'Test_Secret');
let flowId1;
let flowId2;
let app;

beforeAll(async () => {
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


describe('Permissions', () => {
  test('should add a flow', async () => {
    try {
      const res = await request
        .post('/flows/')
        .set('Authorization', `Bearer ${permitToken}`)
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

  test('should get the new flow when permissions are present', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', `Bearer ${permitToken}`);
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.name).toEqual('WiceToSnazzy');
    expect(j).toHaveProperty('_id');
    expect(j).toHaveProperty('graph');
    expect(j.graph).toHaveProperty('nodes');
    expect(j.graph).toHaveProperty('edges');
  });

  test('should get all flows when permissions are present', async () => {
    const res = await request
      .get('/flows/')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[status]': 1,
      })
      .set('Authorization', `Bearer ${permitToken}`);

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('_id');
  });

  test('should not get a particular flows when permissions are absent', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', `Bearer ${unpermitToken}`);
    expect(res.status).toEqual(403);
    expect(res.text).not.toBeNull();
  });

  test('should not get all flows when permissions are absent', async () => {
    const res = await request
      .get('/flows/')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[status]': 1,
      })
      .set('Authorization', `Bearer ${unpermitToken}`);

    expect(res.status).toEqual(403);
  });

  test('should not be able to add a flow without write permission', async () => {
    try {
      const res = await request
        .post('/flows/')
        .set('Authorization', `Bearer ${partpermitToken}`)
        .set('accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          type: 'ordinary',
          name: 'WiceToSnazzy',
          status: 'active',
          description: 'A description',
          owners: [
            { id: 'testTenant1', type: 'tenant' },
          ],
        });

      expect(res.status).toEqual(403);
    } catch (e) {
      log.error(e);
    }
  });

  test('should add a second flow belonging to a tenant', async () => {
    try {
      const res = await request
        .post('/flows/')
        .set('Authorization', `Bearer ${permitToken}`)
        .set('accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          type: 'ordinary',
          name: 'WiceToSnazzy',
          status: 'active',
          description: 'A description',
          owners: [
            { id: 'testTenant1', type: 'tenant' },
          ],
        });

      expect(res.status).toEqual(201);
      expect(res.text).not.toHaveLength(0);
      const j = JSON.parse(res.text);
      expect(j).not.toBeNull();

      expect(j).toHaveProperty('_id');
      flowId2 = j._id;
    } catch (e) {
      log.error(e);
    }
  });

  test('should get the second flow through tenant permissions', async () => {
    const res = await request
      .get(`/flows/${flowId2}`)
      .set('Authorization', `Bearer ${partpermitToken}`);
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.name).toEqual('WiceToSnazzy');
    expect(j).toHaveProperty('_id');
    expect(j).toHaveProperty('graph');
    expect(j.graph).toHaveProperty('nodes');
    expect(j.graph).toHaveProperty('edges');
  });

  test('should not be able to edit the second flow without a write permission', async () => {
    try {
      const res = await request
        .patch(`/flows/${flowId2}`)
        .set('Authorization', `Bearer ${partpermitToken}`)
        .set('accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          type: 'ordinary',
          name: 'WiceToSnazzy',
          status: 'active',
          description: 'A description',
          owners: [
            { id: 'testTenant1', type: 'tenant' },
          ],
        });

      expect(res.status).toEqual(403);
      expect(res.text).not.toHaveLength(0);
    } catch (e) {
      log.error(e);
    }
  });

  test('should not be able to delete the second flow without a write permission', async () => {
    try {
      const res = await request
        .delete(`/flows/${flowId2}`)
        .set('Authorization', `Bearer ${partpermitToken}`)
        .set('accept', 'application/json')
        .set('Content-Type', 'application/json');

      expect(res.status).toEqual(403);
      expect(res.text).not.toHaveLength(0);
    } catch (e) {
      log.error(e);
    }
  });
});
