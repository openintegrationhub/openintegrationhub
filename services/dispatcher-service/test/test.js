/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;
process.env.NODE_ENV = 'test';

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3013;
const request = require('supertest')(`${hostUrl}:${port}`);
const nock = require('nock');
const iamMock = require('./utils/iamMock.js');
const Server = require('../app/server');
const Configuration = require('../app/models/configuration');
const { createDispatches, getTargets, checkFlows } = require('../app/utils/handlers');

const mainServer = new Server();

const log = require('../app/utils/logger'); // eslint-disable-line

let app;

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  await mainServer.setup(mongoose);
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

describe('API', () => {
  const connections = [
    {
      source: {
        appId: 'Snazzy',
        domain: 'Addresses',
      },
      targets: [
        {
          appId: 'Wice',
          routingKey: 'WiceAddressesABCDE',
          flowId: 'ABCDE',
          active: true,
        },
        {
          appId: 'Outlook',
          routingKey: 'OutlookAddressesFGHI',
          flowId: 'FGHI',
          active: true,
        },
      ],
    },
  ];

  test('should post a new configuration', async () => {
    const res = await request
      .put('/dispatches')
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(
        connections,
      );
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.connections).toEqual(connections);
  });

  test('should get the new configuration', async () => {
    const res = await request
      .get('/dispatches')
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.connections).toEqual(connections);
  });

  test('should not get the new configuration from another tenant', async () => {
    const res = await request
      .get('/dispatches')
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(404);
    expect(res.text).not.toHaveLength(0);
  });

  test('should update the configuration', async () => {
    const newConnections = connections;
    newConnections[0].targets.push(
      {
        appId: 'GoogleContacts',
        routingKey: 'GoogleContactsAddressesJKLM',
        flowId: 'JLKM',
        active: true,
      },
    );
    const res = await request
      .put('/dispatches')
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(
        newConnections,
      );
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.connections).toEqual(newConnections);

    // Ensure it updates and does not insert
    const allConfigs = await Configuration.find().lean();
    expect(allConfigs).toHaveLength(1);
  });

  test('should delete the configuration', async () => {
    const res = await request
      .delete('/dispatches')
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);

    const allConfigs = await Configuration.find().lean();
    expect(allConfigs).toHaveLength(0);
  });
});

describe('Event Handlers', () => {
  beforeAll(async () => {
    const config = {
      tenant: 'Test Tenant',
      connections: [
        {
          source: {
            flowId: 'abc',
            appId: 'Snazzy',
          },
          targets: [
            {
              appId: 'Wice',
              flowId: 'def',
            },
            {
              appId: 'Outlook',
              flowId: 'ghi',
            },
          ],
        },
      ],
    };

    const storeConf = new Configuration(config);
    await storeConf.save();
  });

  test('should get the target flow ids for a given source', async () => {
    const targets = await getTargets('abc');
    expect(targets).toEqual(['def', 'ghi']);
  });

  test('should check flow repository for the status of flows', async () => {
    const firstGet = nock('http://localhost:3001/flows/def')
      .get('')
      .reply(200, { data: { status: 'active' } });

    const secondGet = nock('http://localhost:3001/flows/ghi')
      .get('')
      .reply(200, { data: { status: 'inactive' } });

    const flowStart = nock('http://localhost:3001/flows/ghi/start')
      .post('')
      .reply(200, {});

    await checkFlows(['def', 'ghi']);
  });

  test('should generate correct events for a given configuration', async () => {
    const payload = {
      meta: {
        flowId: 'abc',
        appId: 'Snazzy',
        oihUid: 'harbl',
      },
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
      },
    };

    const ev1 = {
      headers: {
        name: 'dispatch.def',
      },
      payload,
    };

    const ev2 = {
      headers: {
        name: 'dispatch.ghi',
      },
      payload,
    };
    const events = await createDispatches(['def', 'ghi'], payload);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(ev1);
    expect(events[1]).toEqual(ev2);
  });
});
