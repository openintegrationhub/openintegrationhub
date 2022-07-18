/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */
/* eslint guard-for-in: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3009;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock');
const token = require('./utils/tokens');
const config = require('../app/config/index');

const Server = require('../app/server');

const mainServer = new Server();

const modelCreator = require('../app/models/modelCreator'); // eslint-disable-line

const storage = require(`../app/api/controllers/${config.storage}`); // eslint-disable-line

const log = require('../app/config/logger');

let functionId;
let app;

beforeAll(async () => {
  iamMock.setup();
  // mainServer.setupMiddleware();
  await mainServer.setupRoutes();
  await mainServer.setupSwagger();
  await mainServer.setup(mongoose);
  app = await mainServer.listen();

  modelCreator.createModels();
});

describe('flow errors', () => {
  test('should add a flow error message to db', async () => {
    const message = {
      flowId: 'Flow1',
      componentId: 'Component1',
      tenantId: 'Tenant1',
      errorName: '404',
      errorText: 'Api endpoint not found',
      errorStack: 'Stack data 1',
      timestamp: 1609506061000,
    };

    for (const timeFrame in config.timeWindows) {
      const result = await storage.addFlowErrorMessage(timeFrame, message);

      expect(result.acknowledged).toEqual(true);
      expect(result.modifiedCount).toEqual(0);
      expect(result.upsertedCount).toEqual(1);
      expect(result.matchedCount).toEqual(0);

      const data = await storage.getFlowData(timeFrame, { isAdmin: true }, message.flowId);

      expect(data.flowId).toEqual(message.flowId);
      expect(data.errorCount).toEqual(1);
      expect(data.errorData.length).toEqual(1);

      expect(data.errorData[0].componentId).toEqual('Component1');
      expect(data.errorData[0].errorName).toEqual('404');
      expect(data.errorData[0].errorText).toEqual('Api endpoint not found');
      expect(data.errorData[0].errorStack).toEqual('Stack data 1');

      expect('timestamp' in data.errorData[0]).toEqual(true);

      expect(data.owners[0]).toEqual(message.tenantId);
    }
  });

  test('should add another flow error message to db', async () => {
    const message = {
      flowId: 'Flow1',
      componentId: 'Component2',
      tenantId: 'Tenant1',
      errorName: '403',
      errorText: 'Auth failed',
      errorStack: 'Stack data 2',
      timestamp: 1609506122000,
    };

    for (const timeFrame in config.timeWindows) {
      const result = await storage.addFlowErrorMessage(timeFrame, message);

      expect(result.acknowledged).toEqual(true);
      expect(result.modifiedCount).toEqual(1);
      expect(result.upsertedCount).toEqual(0);
      expect(result.matchedCount).toEqual(1);

      const data = await storage.getFlowData(timeFrame, { isAdmin: true }, message.flowId);

      expect(data.flowId).toEqual(message.flowId);
      expect(data.errorCount).toEqual(2);
      expect(data.errorData.length).toEqual(2);

      expect(data.errorData[1].componentId).toEqual('Component2');
      expect(data.errorData[1].errorName).toEqual('403');
      expect(data.errorData[1].errorText).toEqual('Auth failed');
      expect(data.errorData[1].errorStack).toEqual('Stack data 2');

      expect('timestamp' in data.errorData[1]).toEqual(true);
    }
  });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
