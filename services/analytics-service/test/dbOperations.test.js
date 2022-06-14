/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */
/* eslint guard-for-in: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

// const hostUrl = 'http://localhost';
// const port = process.env.PORT || 3009;
// const request = require('supertest')(`${hostUrl}:${port}`);
// const iamMock = require('./utils/iamMock');
// const token = require('./utils/tokens');

const Server = require('../app/server');

const mainServer = new Server();

const config = require('../app/config/index'); // eslint-disable-line

const modelCreator = require('../app/models/modelCreator'); // eslint-disable-line

const storage = require(`../app/api/controllers/${config.storage}`); // eslint-disable-line

const log = require('../app/config/logger');

let functionId;
let app;

const exampleFlowData = {
  flowId: 'SomeFlowId',
  flowName: 'SomeFlow',
  status: 'active', // 'active', 'inactive', 'starting', 'stopping'
  statusChangedAt: Date.now(),
  usage: [
    {
      objectId: '1234',
      started: Date.now(),
      ended: Date.now(),
      oihDataSchema: '',
    },
  ],
  owners: ['someOwner'], // tenantId
  errorData: [
    {
      errorName: '1',
      errorText: 'Login invalid',
      timestamp: Date.now(),
    },
  ],
};

beforeAll(async () => {
  // iamMock.setup();
  // mainServer.setupMiddleware();
  await mainServer.setupRoutes();
  await mainServer.setupSwagger();
  await mainServer.setup(mongoose);
  app = await mainServer.listen();

  modelCreator.createModels();
});

describe('DB Operations', () => {
  test('should create a new flow data entry', async () => {
    const timeFrame = Object.entries(config.timeWindows).sort((a, b) => b[1] - a[1])[0][0];
    const result = await storage.createFlowData(timeFrame, { tenant: 'someTenantId', isAdmin: true }, exampleFlowData);

    expect(result).toHaveProperty('_id');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
    expect(result).toHaveProperty('errorData');
    expect(result).toHaveProperty('owners');
    expect(result).toHaveProperty('usage');

    expect(result.errorData[0]).toHaveProperty('timestamp');
    expect(result.errorData[0].errorName).toEqual('1');
    expect(result.errorData[0].errorText).toEqual('Login invalid');

    expect(result.owners[0]).toEqual('someOwner');

    expect(result.usage[0]).toHaveProperty('ended');
    expect(result.usage[0]).toHaveProperty('started');
    expect(result.usage[0].objectId).toEqual('1234');
    expect(result.usage[0].oihDataSchema).toEqual('');
  });

  test('should create new flow stats', async () => {
    const result = await storage.updateFlowStats({ active: 10, inactive: 20 });

    expect(result).toEqual(true);

    const flowStats15 = await modelCreator.models.flowStats_15min.findOne().lean();
    expect(flowStats15.active).toEqual(10);
    expect(flowStats15.inactive).toEqual(20);

    const flowStatsDay = await modelCreator.models.flowStats_day.findOne().lean();
    expect(flowStatsDay.active).toEqual(10);
    expect(flowStatsDay.inactive).toEqual(20);
  });

  test('should update existing flow stats', async () => {
    const result = await storage.updateFlowStats({ active: 20, inactive: 40 });

    expect(result).toEqual(true);

    const flowStats15 = await modelCreator.models.flowStats_15min.findOne().lean();
    expect(flowStats15.active).toEqual(15);
    expect(flowStats15.inactive).toEqual(30);

    const flowStatsDay = await modelCreator.models.flowStats_day.findOne().lean();
    expect(flowStatsDay.active).toEqual(15);
    expect(flowStatsDay.inactive).toEqual(30);
  });

  test('should upsert a flow template entry across all timeframes', async () => {
    const templateData = {
      id: 'id1',
      name: 'Name 1',
      owners: ['tenant1', 'tenant2'],
      graph: {
        edges: [
          {
            id: 'edge1',
            source: 'comp1',
            target: 'comp2',
          },
        ],
      },
    };

    const result = await storage.upsertFlowTemplate(templateData);
    expect(result).toEqual(true);

    for (const timeFrame in config.timeWindows) {
      const entry = await modelCreator.models[`flowTemplates_${timeFrame}`].findOne().lean();
      expect(entry.flowTemplateId).toEqual('id1');
      expect(entry.flowTemplateName).toEqual('Name 1');
      expect(entry.owners[0]).toEqual('tenant1');
      expect(entry.owners[1]).toEqual('tenant2');
      expect(entry.steps).toEqual('2');
    }
  });

  test('should upsert a components entry across all timeframes', async () => {
    const componentData = {
      artifactId: 'id1',
      name: 'Name 1',
      owners: ['tenant1', 'tenant2'],
      active: 'active',
    };

    const result = await storage.upsertComponent(componentData);
    expect(result).toEqual(true);

    for (const timeFrame in config.timeWindows) {
      const entry = await modelCreator.models[`components_${timeFrame}`].findOne().lean();
      expect(entry.componentId).toEqual('id1');
      expect(entry.componentName).toEqual('Name 1');
      expect(entry.owners[0]).toEqual('tenant1');
      expect(entry.owners[1]).toEqual('tenant2');
      expect(entry.status).toEqual('active');
    }
  });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
