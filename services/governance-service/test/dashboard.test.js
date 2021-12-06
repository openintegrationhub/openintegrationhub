/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3009;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock');
const token = require('./utils/tokens');
const { addProvenanceEvent } = require('../app/api/controllers/mongo');
const { reportHealth } = require('../app/utils/eventBus');

const ProvenanceEvent = require('../app/models/provenanceEvent');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let app;

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();

  await new ProvenanceEvent({
    entity: {
      id: 'aoveu03dv921dvo',
      entityType: 'oihUid',
    },
    activity: {
      id: '30j0hew9kwbnkksfb09',
      activityType: 'ObjectReceived',
      used: 'getPersons',
    },
    agent: {
      id: 'w4298jb9q74z4dmjuo',
      agentType: 'Connector',
    },
    actedOnBehalfOf: [
      {
        first: true,
        id: 'w4298jb9q74z4dmjuo',
        agentType: 'Connector',
        actedOnBehalfOf: 'j460ge49qh3rusfuoh',
      },
      {
        id: 'j460ge49qh3rusfuoh',
        agentType: 'User',
        actedOnBehalfOf: adminId,
      },
      {
        id: 'j460ge49qh3rusfuox',
        agentType: 'Application',
        actedOnBehalfOf: 'Google',
      },
      {
        id: 't35fdhtz57586',
        agentType: 'Tenant',
      },
    ],
  }).save();

  await new ProvenanceEvent({
    entity: {
      id: 'aoveu03dv921dva',
      entityType: 'oihUid',
    },
    activity: {
      id: '30j0hew9kwbnkksfb09',
      activityType: 'ObjectCreated',
      used: 'createPerson',
    },
    agent: {
      id: 'w4298jb9q74z4dmjuo',
      agentType: 'Connector',
    },
    actedOnBehalfOf: [
      {
        first: true,
        id: 'w4298jb9q74z4dmjuo',
        agentType: 'Connector',
        actedOnBehalfOf: 'j460ge49qh3rusfuoh',
      },
      {
        id: 'j460ge49qh3rusfuoh',
        agentType: 'User',
        actedOnBehalfOf: adminId,
      },
      {
        id: 'j460ge49qh3rusfuox',
        agentType: 'Application',
        actedOnBehalfOf: 'Office365',
      },
      {
        id: 't35fdhtz57586',
        agentType: 'Tenant',
      },
    ],
  }).save();

  await new ProvenanceEvent({
    entity: {
      id: 'aoveu03dv921dvx',
      entityType: 'oihUid',
    },
    activity: {
      id: '30j0hew9kwbnkksfb09',
      activityType: 'ObjectUpdated',
      used: 'updatePerson',
    },
    agent: {
      id: 'w4298jb9q74z4dmjuo',
      agentType: 'Connector',
    },
    actedOnBehalfOf: [
      {
        first: true,
        id: 'w4298jb9q74z4dmjuo',
        agentType: 'Connector',
        actedOnBehalfOf: 'j460ge49qh3rusfuoh',
      },
      {
        id: 'j460ge49qh3rusfuoh',
        agentType: 'User',
        actedOnBehalfOf: adminId,
      },
      {
        id: 'j460ge49qh3rusfuox',
        agentType: 'Application',
        actedOnBehalfOf: 'Snazzy',
      },
      {
        id: 't35fdhtz57586',
        agentType: 'Tenant',
      },
    ],
  }).save();
});

afterAll(async () => {
  mongoose.connection.close();
  app.close();
});

describe('Dashboard Operations', () => {
  test('should display the swagger-generated HTML page', async () => {
    const res = await request.get('/api-docs/');
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toMatch(/HTML for static distribution bundle build/);
  });

  test('should get the data distribution', async () => {
    const res = await request
      .get('/dashboard/distribution')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.body).toEqual({
      Snazzy: {
        created: 0,
        updated: 1,
        received: 0,
        deleted: 0,
      },
      Office365: {
        created: 1,
        updated: 0,
        received: 0,
        deleted: 0,
      },
      Google: {
        created: 0,
        updated: 0,
        received: 1,
        deleted: 0,
      },
    });
  });
});
