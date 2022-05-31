/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

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
      errorCode: '1',
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

describe.only('DB Operations', () => {
  test('should create a new flow data entry', async () => {
    const timeFrame = Object.entries(config.timeWindows).sort((a, b) => b[1] - a[1])[0][0];
    const result = await storage.createFlowData(timeFrame, { tenant: 'someTenantId', isAdmin: true }, exampleFlowData);
    console.log('resultX:', result);
    expect(result).toEqual('test');
  });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
