/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');
const nock = require('nock');

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
const config = require('../app/config/index'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let app;

const testFlows = {
  data: [
    {
      id: '1',
      name: 'SnazzyToWice',
      description: 'Flow from Snazzy to WiceCRM',
      status: 'starting',
      graph: {
        nodes: [
          {
            id: 'NodeOne',
            componentId: '5ca5c44c187c040010a9bb8b',
            function: 'upsertPerson',
            fields: {
              username: 'TestName',
              password: 'TestPass',
            },
          },
          {
            id: 'NodeTwo',
            componentId: '5ca5c44c187c040010a9bb8c',
            function: 'transformTestFromOih',
          },
        ],
        edges: [
          {
            source: 'NodeTwo',
            target: 'NodeOne',
          },
        ],
      },
    },
    {
      id: '2',
      name: 'SnazzyToWice with Governance',
      description: 'Flow from Snazzy to WiceCRM with Governance activated',
      status: 'active',
      graph: {
        nodes: [
          {
            id: 'NodeOne',
            componentId: '5ca5c44c187c040010a9bb8b',
            function: 'upsertPerson',
            fields: {
              username: 'TestName',
              password: 'TestPass',
            },
            nodeSettings: {
              governance: true,
            },
          },
          {
            id: 'NodeTwo',
            componentId: '5ca5c44c187c040010a9bb8c',
            function: 'transformTestFromOih',
            nodeSettings: {
              governance: true,
            },
          },
        ],
        edges: [
          {
            source: 'NodeTwo',
            target: 'NodeOne',
          },
        ],
      },
    },
  ],
  meta: {
    total: 2,
    page: 1,
    perPage: 10,
    totalPages: 1,
  },
};

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();

  nock(config.flowRepoUrl)
    .get('/flows')
    .query({ page: 1 })
    .reply(200, testFlows)
    .persist();

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
        id: 'j460ge49qh3rusfuos',
        agentType: 'Flow',
        actedOnBehalfOf: 'Flow1',
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
        id: 'j460ge49qh3rusfuox',
        agentType: 'Flow',
        actedOnBehalfOf: 'Flow2',
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
        id: 'j460ge49qh3rusfuoz',
        agentType: 'Flow',
        actedOnBehalfOf: 'Flow1',
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

  test('should get the data distribution as graph', async () => {
    const res = await request
      .get('/dashboard/distribution/graph')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    const graph = res.body;

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);

    expect(graph.nodes).toContainEqual({
      data: {
        id: 'Google',
        created: 0,
        updated: 0,
        received: 1,
        deleted: 0,
      },
    });

    expect(graph.nodes).toContainEqual({
      data: {
        id: 'Snazzy',
        created: 0,
        updated: 1,
        received: 0,
        deleted: 0,
      },
    });

    expect(graph.nodes).toContainEqual({
      data: {
        id: 'Office365',
        created: 1,
        updated: 0,
        received: 0,
        deleted: 0,
      },
    });

    expect(graph.edges).toContainEqual({
      data: {
        id: 'Flow1',
        source: 'Google',
        target: 'Snazzy',
        created: 0,
        updated: 1,
        received: 1,
        deleted: 0,
      },
    });

    expect(graph.edges).toContainEqual({
      data: {
        id: 'Flow2',
        source: false,
        target: 'Office365',
        created: 1,
        updated: 0,
        received: 0,
        deleted: 0,
      },
    });
  });

  test.only('should get the data graph drawn as html', async () => {
    const res = await request
      .get('/dashboard/distribution/graph/html')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    const html = res.text;

    expect(html).toMatch(/^<html>/);
    expect(html).toMatch(/.*Office365/);
    expect(html).toMatch(/.*Snazzy/);
    expect(html).toMatch(/.*Google/);
    expect(html).toMatch(/<\/html>$/);
  });

  test('should get the flows with warnings', async () => {
    const res = await request
      .get('/dashboard/warnings')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(Array.isArray(res.body.flowWarnings)).toEqual(true);
    expect(res.body.flowWarnings.length).toEqual(1);
    expect(res.body.flowWarnings[0].flowId).toEqual('1');
    expect(res.body.flowWarnings[0].reason).toEqual('No node settings');
    expect(res.body.flowWarnings[0].flowData).toEqual(testFlows.data[0]);
  });
});
