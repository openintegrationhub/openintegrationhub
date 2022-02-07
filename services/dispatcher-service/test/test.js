/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */
/* eslint import/no-extraneous-dependencies: 0 */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;
process.env.NODE_ENV = 'test';

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3013;
const request = require('supertest')(`${hostUrl}:${port}`);
const nock = require('nock');
const lodash = require('lodash');
const iamMock = require('./utils/iamMock');
const Server = require('../app/server');
const Configuration = require('../app/models/configuration');
const { createDispatches, getTargets, checkFlows } = require('../app/utils/handlers');
const { makeFlow, createFlows, updateConfigFlows } = require('../app/utils/flowCreator');

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
    expect(res.text).toMatch(/HTML\sfor\sstatic\sdistribution\sbundle\sbuild/);
  });
});

describe('API', () => {
  let configId;
  let config;
  let appId;
  const applications = [
    {
      applicationName: 'SnazzyContacts',
      applicationUid: 'snazzy1234',
      adapterComponentId: 'snazzyAdapterId',
      transformerComponentId: 'snazzyTransformerId',
      secretId: 'snazzySecretId',

      outbound: {
        active: true,
        flows: [
          {
            transformerAction: 'transformToOih',
            adapterAction: 'getPersons',
            schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
          },
        ],
      },

      inbound: {
        active: true,
        flows: [
          {
            operation: 'CREATE',
            transformerAction: 'transformFromOih',
            adapterAction: 'createPerson',
            schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
          },
          {
            operation: 'UPDATE',
            transformerAction: 'transformFromOih',
            adapterAction: 'updatePerson',
            schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
          },
          {
            operation: 'DELETE',
            transformerAction: 'transformFromOih',
            adapterAction: 'deletePerson',
            schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
          },
        ],
      },
    },
    {
      applicationName: 'Wice CRM',
      applicationUid: 'wice5678',
      adapterComponentId: 'wiceAdapterId',
      transformerComponentId: 'wiceTransformerId',
      secretId: 'wiceSecretId',

      outbound: {
        active: true,
        flows: [
          {
            transformerAction: 'transformToOih',
            adapterAction: 'getPersons',
            schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
          },
        ],
      },

      inbound: {
        active: true,
        flows: [
          {
            operation: 'CREATE',
            transformerAction: 'transformFromOih',
            adapterAction: 'createContact',
            schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
          },
          {
            operation: 'UPDATE',
            transformerAction: 'transformFromOih',
            adapterAction: 'updateContact',
            schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
          },
        ],
      },
    },
  ];

  test('should post a new configuration', async () => {
    for (let i = 0; i < 7; i += 1) {
      nock('http://localhost:3001/flows')
        .post('')
        .reply(201, { data: { id: `AutoFlow${i}` } });

      nock(`http://localhost:3001/flows/AutoFlow${i}`)
        .patch('')
        .reply(200, { data: { id: `AutoFlow${i}` } });
    }

    const res = await request
      .post('/dispatches')
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(
        {
          name: 'TestConfig',
          applications,
        },
      );
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.name).toEqual('TestConfig');
    expect(res.body.data.applications).toHaveLength(2);
    expect(res.body.data.applications[0].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[0].outbound.flows[0].flowId).toEqual('AutoFlow0');
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[0].inbound.flows).toHaveLength(3);
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[1].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[1].outbound.flows[0].flowId).toEqual('AutoFlow4');
    expect(res.body.data.applications[1].inbound.flows).toHaveLength(2);
    expect(res.body.data.applications[1].inbound.flows[0].flowId).toEqual('AutoFlow5');
  });

  test('should get all configurations', async () => {
    const res = await request
      .get('/dispatches')
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data[0].tenant).toEqual('TestTenant');
    expect(res.body.data[0].applications).toHaveLength(2);
    expect(res.body.data[0].applications[0].outbound.flows).toHaveLength(1);
    expect(res.body.data[0].applications[0].outbound.flows[0].flowId).toEqual('AutoFlow0');
    expect(res.body.data[0].applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data[0].applications[0].inbound.flows).toHaveLength(3);
    expect(res.body.data[0].applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data[0].applications[1].outbound.flows).toHaveLength(1);
    expect(res.body.data[0].applications[1].outbound.flows[0].flowId).toEqual('AutoFlow4');
    expect(res.body.data[0].applications[1].inbound.flows).toHaveLength(2);
    expect(res.body.data[0].applications[1].inbound.flows[0].flowId).toEqual('AutoFlow5');

    configId = res.body.data[0].id;
  });

  test('should not get the new configuration from another tenant', async () => {
    const res = await request
      .get('/dispatches')
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data).toHaveLength(0);
  });

  test('should add a new app to the configuration', async () => {
    nock('http://localhost:3001/flows')
      .post('')
      .reply(201, { data: { id: 'GoogleFlow' } });

    nock('http://localhost:3001/flows/GoogleFlow')
      .patch('')
      .reply(200, { data: { id: 'GoogleFlow' } });

    const res = await request
      .put(`/dispatches/${configId}/app`)
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(
        {
          applicationName: 'Google Contacts',
          applicationUid: 'google1357',
          adapterComponentId: 'googleAdapterId',
          transformerComponentId: 'googleTransformerId',
          secretId: 'googleSecretId',

          outbound: {
            active: true,
            flows: [
              {
                transformerAction: 'transformToOih',
                adapterAction: 'getContacts',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              },
            ],
          },
          inbound: {
            active: false,
          },
        },
      );

    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.applications).toHaveLength(3);
    expect(res.body.data.applications[0].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[0].outbound.flows[0].flowId).toEqual('AutoFlow0');
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[0].inbound.flows).toHaveLength(3);
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[1].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[1].outbound.flows[0].flowId).toEqual('AutoFlow4');
    expect(res.body.data.applications[1].inbound.flows).toHaveLength(2);
    expect(res.body.data.applications[1].inbound.flows[0].flowId).toEqual('AutoFlow5');
    expect(res.body.data.applications[2].applicationName).toEqual('Google Contacts');
    expect(res.body.data.applications[2].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[2].outbound.flows[0].flowId).toEqual('GoogleFlow');
    expect(res.body.data.applications[2].inbound.flows).toHaveLength(0);
  });

  test('should single get only the new configuration', async () => {
    const res = await request
      .get(`/dispatches/${configId}`)
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.applications).toHaveLength(3);
    expect(res.body.data.applications[0].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[0].outbound.flows[0].flowId).toEqual('AutoFlow0');
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[0].inbound.flows).toHaveLength(3);
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[1].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[1].outbound.flows[0].flowId).toEqual('AutoFlow4');
    expect(res.body.data.applications[1].inbound.flows).toHaveLength(2);
    expect(res.body.data.applications[1].inbound.flows[0].flowId).toEqual('AutoFlow5');
    expect(res.body.data.applications[2].applicationName).toEqual('Google Contacts');
    expect(res.body.data.applications[2].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[2].outbound.flows[0].flowId).toEqual('GoogleFlow');
    expect(res.body.data.applications[2].inbound.flows).toHaveLength(0);

    appId = res.body.data.applications[2]._id;
  });

  test('should remove an app from the configuration', async () => {
    nock('http://localhost:3001/flows/GoogleFlow')
      .delete('')
      .reply(200);

    const res = await request
      .delete(`/dispatches/${configId}/app/${appId}`)
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.applications).toHaveLength(2);
    expect(res.body.data.applications[0].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[0].outbound.flows[0].flowId).toEqual('AutoFlow0');
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[0].inbound.flows).toHaveLength(3);
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[1].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[1].outbound.flows[0].flowId).toEqual('AutoFlow4');
    expect(res.body.data.applications[1].inbound.flows).toHaveLength(2);
    expect(res.body.data.applications[1].inbound.flows[0].flowId).toEqual('AutoFlow5');
    config = res.body.data;
  });

  test('update the entire configuration', async () => {
    nock('http://localhost:3001/flows/AutoFlow3')
      .delete('')
      .reply(200);

    nock('http://localhost:3001/flows/AutoFlow4')
      .delete('')
      .reply(200);

    nock('http://localhost:3001/flows')
      .post('')
      .reply(201, { data: { id: 'PatchFlow' } });

    nock('http://localhost:3001/flows/PatchFlow')
      .patch('', {
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{
            id: 'step_1', componentId: '5d2484d2a422ca001bda5690', name: 'SDF Adapter', function: 'receiveEvents', description: 'Receives data from SDF', fields: { amqpUrl: 'amqp://guest:guest@localhost:5672', flowId: 'PatchFlow' },
          }, {
            id: 'step_2', componentId: 'wiceAdapterId', credentials_id: 'wiceSecretId', name: 'Wice CRM Adapter', function: 'deletePerson', description: 'Pushes data',
          }, {
            id: 'step_3', componentId: '5d2484d2a422ca001bda5690', name: 'SDF Adapter', function: 'processRecordUid', description: 'Updates recordUid', fields: { amqpUrl: 'amqp://guest:guest@localhost:5672', flowId: 'PatchFlow' },
          }],
          edges: [{ source: 'step_1', target: 'step_2' }, { source: 'step_2', target: 'step_3' }],
        },
        type: 'ordinary',
        cron: '* * * * *',
        name: 'H&S Inbound DELETE Flow for Wice CRM',
      })
      .reply(200, { data: { id: 'PatchFlow' } });

    const updatedConfig = lodash.cloneDeep(config);

    updatedConfig.name = 'UpdatedConfig';

    updatedConfig.applications[0].inbound.flows.splice(2, 1);
    updatedConfig.applications[1].outbound.active = false;
    updatedConfig.applications[1].outbound.flows.splice(0, 1);
    updatedConfig.applications[1].inbound.flows.push({
      operation: 'DELETE',
      transformerAction: 'transformFromOih',
      adapterAction: 'deletePerson',
      schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
    });

    const res = await request
      .patch(`/dispatches/${configId}`)
      .set('Authorization', 'Bearer userToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(updatedConfig);

    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.data.tenant).toEqual('TestTenant');
    expect(res.body.data.name).toEqual('UpdatedConfig');
    expect(res.body.data.applications).toHaveLength(2);
    expect(res.body.data.applications[0].outbound.flows).toHaveLength(1);
    expect(res.body.data.applications[0].outbound.flows[0].flowId).toEqual('AutoFlow0');
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[0].inbound.flows).toHaveLength(2);
    expect(res.body.data.applications[0].inbound.flows[0].flowId).toEqual('AutoFlow1');
    expect(res.body.data.applications[1].outbound.flows).toHaveLength(0);
    expect(res.body.data.applications[1].outbound.active).toEqual(false);
    expect(res.body.data.applications[1].inbound.flows).toHaveLength(3);
    expect(res.body.data.applications[1].inbound.flows[0].flowId).toEqual('AutoFlow5');
    expect(res.body.data.applications[1].inbound.flows[2].flowId).toEqual('PatchFlow');
  });

  test('should delete the configuration', async () => {
    for (let i = 0; i < 7; i += 1) {
      nock(`http://localhost:3001/flows/AutoFlow${i}`)
        .delete('')
        .reply(200);
    }

    nock('http://localhost:3001/flows/PatchFlow')
      .delete('')
      .reply(200);

    const res = await request
      .delete(`/dispatches/${configId}`)
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
      applications: [
        {
          applicationName: 'SnazzyContacts',
          applicationUid: 'snazzy1234',
          adapterComponentId: 'snazzyAdapterId',
          transformerComponentId: 'snazzyTransformerId',
          secretId: 'snazzySecretId',

          outbound: {
            active: true,
            flows: [
              {
                transformerAction: 'transformToOih',
                adapterAction: 'getPersons',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'SnazzyOutbound',
              },
            ],
          },

          inbound: {
            active: true,
            flows: [
              {
                operation: 'CREATE',
                transformerAction: 'transformFromOih',
                adapterAction: 'createPerson',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'SnazzyInboundCreate',
              },
              {
                operation: 'UPDATE',
                transformerAction: 'transformFromOih',
                adapterAction: 'updatePerson',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'SnazzyInboundUpdate',
              },
              {
                operation: 'DELETE',
                transformerAction: 'transformFromOih',
                adapterAction: 'deletePerson',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'SnazzyInboundDelete',
              },
            ],
          },
        },
        {
          applicationName: 'Wice CRM',
          applicationUid: 'wice5678',
          adapterComponentId: 'wiceAdapterId',
          transformerComponentId: 'wiceTransformerId',
          secretId: 'wiceSecretId',

          outbound: {
            active: true,
            flows: [
              {
                transformerAction: 'transformToOih',
                adapterAction: 'getPersons',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'WiceOutbound',
              },
            ],
          },

          inbound: {
            active: true,
            flows: [
              {
                operation: 'CREATE',
                transformerAction: 'transformFromOih',
                adapterAction: 'createContact',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'WiceInboundCreate',
              },
              {
                operation: 'UPDATE',
                transformerAction: 'transformFromOih',
                adapterAction: 'updateContact',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'WiceInboundUpdate',
              },
            ],
          },
        },
        {
          applicationName: 'Google Contacts',
          applicationUid: 'google1357',
          adapterComponentId: 'googleAdapterId',
          transformerComponentId: 'googleTransformerId',
          secretId: 'googleSecretId',

          outbound: {
            active: false,
            flows: [],
          },

          inbound: {
            active: true,
            flows: [
              {
                operation: 'CREATE',
                transformerAction: 'transformFromOih',
                adapterAction: 'createContact',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'GoogleInboundCreate',
              },
            ],
          },
        },
      ],
    };

    const storeConf = new Configuration(config);
    await storeConf.save();
  });

  test('should get the target flow ids for a given source', async () => {
    const targets = await getTargets('SnazzyOutbound', 'CREATE');
    expect(targets).toEqual([{ flowId: 'WiceInboundCreate', applicationUid: 'wice5678' }, { flowId: 'GoogleInboundCreate', applicationUid: 'google1357' }]);
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

    await checkFlows([{ flowId: 'def', applicationUid: 'Wice' }, { flowId: 'ghi', applicationUid: 'Outlook' }]);
  });

  test('should generate correct events for a given configuration', async () => {
    const payload = {
      meta: {
        flowId: 'abc',
        oihUid: 'harbl',
        refs: [
          {
            applicationUid: 'Wice',
            recordUid: '1234',
          },
          {
            applicationUid: 'Outlook',
            recordUid: '5678',
          },
        ],
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
      payload: {
        meta: {
          flowId: 'abc',
          oihUid: 'harbl',
          applicationUid: 'Wice',
          recordUid: '1234',
        },
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
        },
      },
    };

    const ev2 = {
      headers: {
        name: 'dispatch.ghi',
      },
      payload: {
        meta: {
          flowId: 'abc',
          oihUid: 'harbl',
          applicationUid: 'Outlook',
          recordUid: '5678',
        },
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
        },
      },
    };

    const events = await createDispatches([{ flowId: 'def', applicationUid: 'Wice' }, { flowId: 'ghi', applicationUid: 'Outlook' }], payload);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(ev1);
    expect(events[1]).toEqual(ev2);
  });
});

describe('Flow Handling', () => {
  test('should generate a valid outbound flow', async () => {
    const getFlow = makeFlow(
      {
        applicationUid: 'test1234',
        applicationName: 'Test Application',
        adapterComponentId: 'testAdapterId',
        transformerComponentId: 'testTransformerId',
        secretId: 'testSecretId',
      },
      {
        adapterAction: 'getPersons',
        transformerAction: 'transformPersonToOih',
        schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
      },
    );

    const reference = {
      name: 'H&S Outbound Flow for Test Application',
      description: 'This flow was automatically generated',
      graph: {
        nodes: [
          {
            id: 'step_1',
            componentId: 'testAdapterId',
            credentials_id: 'testSecretId',
            name: 'Test Application Adapter',
            function: 'getPersons',
            description: 'Fetches data',
            fields: {
              applicationUid: 'test1234',
              domainId: 'testDomainId',
              schema: 'person',
            },
          },
          // {
          //   id: 'step_2',
          //   componentId: 'testTransformerId',
          //   name: 'Test Application Transformer',
          //   function: 'transformPersonToOih',
          //   description: 'Transforms data',
          // },
          {
            id: 'step_2',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'sendMessageToOih',
            description: 'Passes data to SDF',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
            },
          },
        ],
        edges: [
          {
            source: 'step_1',
            target: 'step_2',
          },
          // {
          //   source: 'step_2',
          //   target: 'step_3',
          // },
        ],
      },
      type: 'ordinary',
      cron: '* * * * *',
    };

    expect(getFlow).toEqual(reference);
  });

  test('should generate a valid inbound update flow', async () => {
    const updateFlow = makeFlow(
      {
        applicationName: 'Test Application',
        adapterComponentId: 'testAdapterId',
        transformerComponentId: 'testTransformerId',
        secretId: 'testSecretId',
      },
      {
        adapterAction: 'updatePerson',
        transformerAction: 'transformPersonFromOih',
        schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
        operation: 'UPDATE',
      },
    );

    const reference = {
      name: 'H&S Inbound UPDATE Flow for Test Application',
      description: 'This flow was automatically generated',
      graph: {
        nodes: [
          {
            id: 'step_1',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'receiveEvents',
            description: 'Receives data from SDF',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
            },
          },
          // {
          //   id: 'step_2',
          //   componentId: 'testTransformerId',
          //   name: 'Test Application Transformer',
          //   function: 'transformPersonFromOih',
          //   description: 'Transforms data',
          // },
          {
            id: 'step_2',
            componentId: 'testAdapterId',
            credentials_id: 'testSecretId',
            name: 'Test Application Adapter',
            function: 'updatePerson',
            description: 'Pushes data',
          },
          {
            id: 'step_3',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'processRecordUid',
            description: 'Updates recordUid',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
            },
          },
        ],
        edges: [
          {
            source: 'step_1',
            target: 'step_2',
          },
          {
            source: 'step_2',
            target: 'step_3',
          },
          // {
          //   source: 'step_3',
          //   target: 'step_4',
          // },
        ],
      },
      type: 'ordinary',
      cron: '* * * * *',
    };

    expect(updateFlow).toEqual(reference);
  });

  test('should generate a valid inbound create flow', async () => {
    const createFlow = makeFlow(
      {
        applicationName: 'Test Application',
        adapterComponentId: 'testAdapterId',
        transformerComponentId: 'testTransformerId',
        secretId: 'testSecretId',
      },
      {
        adapterAction: 'createPerson',
        transformerAction: 'transformPersonFromOih',
        schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
        operation: 'CREATE',
      },
    );

    const reference = {
      name: 'H&S Inbound CREATE Flow for Test Application',
      description: 'This flow was automatically generated',
      graph: {
        nodes: [
          {
            id: 'step_1',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'receiveEvents',
            description: 'Receives data from SDF',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
            },
          },
          // {
          //   id: 'step_2',
          //   componentId: 'testTransformerId',
          //   name: 'Test Application Transformer',
          //   function: 'transformPersonFromOih',
          //   description: 'Transforms data',
          // },
          {
            id: 'step_2',
            componentId: 'testAdapterId',
            credentials_id: 'testSecretId',
            name: 'Test Application Adapter',
            function: 'createPerson',
            description: 'Pushes data',
          },
          {
            id: 'step_3',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'processRecordUid',
            description: 'Updates recordUid',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
            },
          },
        ],
        edges: [
          {
            source: 'step_1',
            target: 'step_2',
          },
          {
            source: 'step_2',
            target: 'step_3',
          },
          // {
          //   source: 'step_3',
          //   target: 'step_4',
          // },
        ],
      },
      type: 'ordinary',
      cron: '* * * * *',
    };

    expect(createFlow).toEqual(reference);
  });

  test('should make calls to Flow Repository to create flows', async () => {
    nock('http://localhost:3001/flows')
      .post('', {
        name: 'H&S Outbound Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{ id: 'empty', componentId: '5f895922926f72cf78353272', function: 'empty' }],
          edges: [],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(201, { data: { id: 'OutboundId' } });

    nock('http://localhost:3001/flows/OutboundId')
      .patch('', {
        name: 'H&S Outbound Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{
            id: 'step_1',
            credentials_id: 'snazzySecretId',
            name: 'Snazzy Contacts Adapter',
            function: 'getPersons',
            description: 'Fetches data',
            componentId: 'snazzyAdapterId',
            fields: { domainId: 'testDomainId', schema: 'person', applicationUid: 'snazzy1234' },
          },
          // {
          //   id: 'step_2', name: 'Snazzy Contacts Transformer',
          // function: 'transformToOih', description: 'Transforms data',
          // componentId: 'snazzyTransformerId',
          // },
          {
            id: 'step_2',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'sendMessageToOih',
            description: 'Passes data to SDF',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
              flowId: 'OutboundId',
            },
          }],
          edges: [
            { source: 'step_1', target: 'step_2' },
            // { source: 'step_2', target: 'step_3' }
          ],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(200, { data: { id: 'OutboundId' } });

    nock('http://localhost:3001/flows')
      .post('', {
        name: 'H&S Inbound CREATE Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{ id: 'empty', componentId: '5f895922926f72cf78353272', function: 'empty' }],
          edges: [],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(201, { data: { id: 'InboundIdCreate' } });

    nock('http://localhost:3001/flows/InboundIdCreate')
      .patch('', {
        name: 'H&S Inbound CREATE Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{
            id: 'step_1',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'receiveEvents',
            description: 'Receives data from SDF',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
              flowId: 'InboundIdCreate',
            },
          },
          // {
          //   id: 'step_2', name: 'Snazzy Contacts Transformer',
          // function: 'transformFromOih', description: 'Transforms data',
          // componentId: 'snazzyTransformerId',
          // },
          {
            id: 'step_2', credentials_id: 'snazzySecretId', name: 'Snazzy Contacts Adapter', function: 'createPerson', description: 'Pushes data', componentId: 'snazzyAdapterId',
          }, {
            id: 'step_3',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'processRecordUid',
            description: 'Updates recordUid',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
              flowId: 'InboundIdCreate',
            },
          }],
          edges: [
            { source: 'step_1', target: 'step_2' }, { source: 'step_2', target: 'step_3' },
            // { source: 'step_3', target: 'step_4' }
          ],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(200, { data: { id: 'InboundIdCreate' } });

    nock('http://localhost:3001/flows')
      .post('', {
        name: 'H&S Inbound UPDATE Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{ id: 'empty', componentId: '5f895922926f72cf78353272', function: 'empty' }],
          edges: [],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(201, { data: { id: 'InboundIdUpdate' } });

    nock('http://localhost:3001/flows/InboundIdUpdate')
      .patch('', {
        name: 'H&S Inbound UPDATE Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{
            id: 'step_1',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'receiveEvents',
            description: 'Receives data from SDF',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
              flowId: 'InboundIdUpdate',
            },
          },
          // {
          //   id: 'step_2', name: 'Snazzy Contacts Transformer',
          // function: 'transformFromOih', description: 'Transforms data',
          // componentId: 'snazzyTransformerId',
          // },
          {
            id: 'step_2', credentials_id: 'snazzySecretId', name: 'Snazzy Contacts Adapter', function: 'updatePerson', description: 'Pushes data', componentId: 'snazzyAdapterId',
          },
          {
            id: 'step_3',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'processRecordUid',
            description: 'Updates recordUid',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
              flowId: 'InboundIdUpdate',
            },
          }],
          edges: [
            { source: 'step_1', target: 'step_2' }, { source: 'step_2', target: 'step_3' },
            // { source: 'step_3', target: 'step_4' }
          ],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(200, { data: { id: 'InboundIdUpdate' } });

    nock('http://localhost:3001/flows')
      .post('', {
        name: 'H&S Inbound DELETE Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{ id: 'empty', componentId: '5f895922926f72cf78353272', function: 'empty' }],
          edges: [],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(201, { data: { id: 'InboundIdDelete' } });

    nock('http://localhost:3001/flows/InboundIdDelete')
      .patch('', {
        name: 'H&S Inbound DELETE Flow for Snazzy Contacts',
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{
            id: 'step_1',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'receiveEvents',
            description: 'Receives data from SDF',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
              flowId: 'InboundIdDelete',
            },
          },
          // {
          //   id: 'step_2', name: 'Snazzy Contacts Transformer',
          // function: 'transformFromOih', description: 'Transforms data',
          // componentId: 'snazzyTransformerId',
          // },
          {
            id: 'step_2', credentials_id: 'snazzySecretId', name: 'Snazzy Contacts Adapter', function: 'deletePerson', description: 'Pushes data', componentId: 'snazzyAdapterId',
          }, {
            id: 'step_3',
            componentId: '5d2484d2a422ca001bda5690',
            name: 'SDF Adapter',
            function: 'processRecordUid',
            description: 'Updates recordUid',
            fields: {
              amqpUrl: 'amqp://guest:guest@localhost:5672',
              flowId: 'InboundIdDelete',
            },
          }],
          edges: [
            { source: 'step_1', target: 'step_2' }, { source: 'step_2', target: 'step_3' },
            // { source: 'step_3', target: 'step_4' }
          ],
        },
        type: 'ordinary',
        cron: '* * * * *',
      })
      .reply(200, { data: { id: 'InboundIdDelete' } });

    const applications = [
      {
        applicationUid: 'snazzy1234',
        applicationName: 'Snazzy Contacts',
        adapterComponentId: 'snazzyAdapterId',
        transformerComponentId: 'snazzyTransformerId',
        secretId: 'snazzySecretId',

        outbound: {
          active: true,
          flows: [
            {
              transformerAction: 'transformToOih',
              adapterAction: 'getPersons',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
            },
            {
              transformerAction: 'pre-existing',
              adapterAction: 'should not call a flow create because flowId is set',
              schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              flowId: 'ExistingFlowId',
            },
          ],
        },

        inbound: {
          active: true,
          flows: [
            {
              operation: 'CREATE',
              transformerAction: 'transformFromOih',
              adapterAction: 'createPerson',
            },
            {
              operation: 'UPDATE',
              transformerAction: 'transformFromOih',
              adapterAction: 'updatePerson',
            },
            {
              operation: 'DELETE',
              transformerAction: 'transformFromOih',
              adapterAction: 'deletePerson',
            },
          ],
        },
      },
    ];

    const newApplications = await createFlows(applications, 'aBearerToken');

    expect(newApplications[0].outbound.flows[0].flowId).toEqual('OutboundId');
    expect(newApplications[0].outbound.flows[1].flowId).toEqual('ExistingFlowId');
    expect(newApplications[0].inbound.flows[0].flowId).toEqual('InboundIdCreate');
    expect(newApplications[0].inbound.flows[1].flowId).toEqual('InboundIdUpdate');
    expect(newApplications[0].inbound.flows[2].flowId).toEqual('InboundIdDelete');
  });

  test('should handle an updated config', async () => {
    nock('http://localhost:3001/flows/existingInboundFlow')
      .delete('')
      .reply(200, {});

    nock('http://localhost:3001/flows')
      .post('')
      .reply(201, { data: { id: 'newInboundFlow' } });

    nock('http://localhost:3001/flows/newInboundFlow')
      .patch('', {
        description: 'This flow was automatically generated',
        graph: {
          nodes: [{
            id: 'step_1', componentId: '5d2484d2a422ca001bda5690', name: 'SDF Adapter', function: 'receiveEvents', description: 'Receives data from SDF', fields: { amqpUrl: 'amqp://guest:guest@localhost:5672', flowId: 'newInboundFlow' },
          }, {
            id: 'step_2', componentId: 'wiceAdapterId', credentials_id: 'wiceSecretId', name: 'Wice CRM Adapter', function: 'upsertPerson', description: 'Pushes data',
          }, {
            id: 'step_3', componentId: '5d2484d2a422ca001bda5690', name: 'SDF Adapter', function: 'processRecordUid', description: 'Updates recordUid', fields: { amqpUrl: 'amqp://guest:guest@localhost:5672', flowId: 'newInboundFlow' },
          }],
          edges: [{ source: 'step_1', target: 'step_2' }, { source: 'step_2', target: 'step_3' }],
        },
        type: 'ordinary',
        cron: '* * * * *',
        name: 'H&S Inbound CREATE Flow for Wice CRM',
      })
      .reply(200, { data: { id: 'newInboundFlow' } });

    const existingConfig = {
      tenant: 'abc',
      name: 'Nice Config',
      applications: [
        {
          applicationUid: 'snazzy1234',
          applicationName: 'Snazzy Contacts',
          adapterComponentId: 'snazzyAdapterId',
          transformerComponentId: 'snazzyTransformerId',
          secretId: 'snazzySecretId',

          outbound: {
            active: true,
            flows: [
              {
                transformerAction: 'transformToOih',
                adapterAction: 'getPersons',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'existingOutBoundFlow',
              },
            ],
          },

          inbound: {
            active: true,
            flows: [
              {
                operation: 'CREATE',
                transformerAction: 'transformFromOih',
                adapterAction: 'createPerson',
                flowId: 'existingInboundFlow',
              },
            ],
          },
        },
      ],
    };

    const newConfig = {
      tenant: 'abc',
      name: 'Best Config',
      applications: [
        {
          applicationUid: 'snazzy1234',
          applicationName: 'Snazzy Contacts',
          adapterComponentId: 'snazzyAdapterId',
          transformerComponentId: 'snazzyTransformerId',
          secretId: 'snazzySecretIdNew',

          outbound: {
            active: true,
            flows: [
              {
                transformerAction: 'transformToOih',
                adapterAction: 'getPersons',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
                flowId: 'existingOutBoundFlow',
              },
            ],
          },

          inbound: {
            active: false,
            flows: [],
          },
        },
        {
          applicationUid: 'wice5678',
          applicationName: 'Wice CRM',
          adapterComponentId: 'wiceAdapterId',
          transformerComponentId: 'wiceTransformerId,',
          secretId: 'wiceSecretId',

          outbound: {
            active: false,
            flows: [],
          },

          inbound: {
            active: true,
            flows: [
              {
                transformerAction: 'transformFromOih',
                adapterAction: 'upsertPerson',
                operation: 'CREATE',
                schemaUri: 'http://metadata.openintegrationhub.com/api/v1/domains/testDomainId/schemas/person',
              },
            ],
          },
        },
      ],
    };

    const updatedConfig = await updateConfigFlows(existingConfig, newConfig, 'aBearerToken');

    expect(updatedConfig.name).toEqual('Best Config');
    expect(updatedConfig.tenant).toEqual('abc');
    expect(updatedConfig.applications).toHaveLength(2);
    expect(updatedConfig.applications[0].applicationUid).toEqual('snazzy1234');
    expect(updatedConfig.applications[0].secretId).toEqual('snazzySecretIdNew');
    expect(updatedConfig.applications[0].outbound.active).toEqual(true);
    expect(updatedConfig.applications[0].inbound.active).toEqual(false);
    expect(updatedConfig.applications[0].outbound.flows).toHaveLength(1);
    expect(updatedConfig.applications[0].outbound.flows[0].flowId).toEqual('existingOutBoundFlow');
    expect(updatedConfig.applications[1].applicationUid).toEqual('wice5678');
    expect(updatedConfig.applications[1].secretId).toEqual('wiceSecretId');
    expect(updatedConfig.applications[1].outbound.active).toEqual(false);
    expect(updatedConfig.applications[1].inbound.active).toEqual(true);
    expect(updatedConfig.applications[1].inbound.flows).toHaveLength(1);
    expect(updatedConfig.applications[1].inbound.flows[0].flowId).toEqual('newInboundFlow');
  });
});
