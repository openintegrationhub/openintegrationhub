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
const config = require('../app/config/index');

const Server = require('../app/server');

const mainServer = new Server();

const modelCreator = require('../app/models/modelCreator'); // eslint-disable-line

const storage = require(`../app/api/controllers/${config.storage}`); // eslint-disable-line

const log = require('../app/config/logger');

let functionId;
let app;

beforeAll(async () => {
  // iamMock.setup();
  // mainServer.setupMiddleware();
  await mainServer.setupRoutes();
  await mainServer.setupSwagger();
  await mainServer.setup(mongoose);
  app = await mainServer.listen();

  modelCreator.createModels();
  console.log('modelCreator.models', Object.keys(modelCreator.models));
});

describe.only('flow errors', () => {
  test.only('should add a flow error message to db', async () => {
    const message = {
      flowId: 'Flow1',
      componentId: 'Component1',
      tenantId: 'Tenant1',
      errorCode: '404',
      errorText: 'Api endpoint not found',
      timestamp: Date.now(),
    };
    console.log('X=X=X=');
    const result = await storage.addFlowErrorMessage(message);
    console.log(result);

    const data = await storage.getAllFlowData('15min', { isAdmin: true }, 10, 1);

    console.log('data:', data);

    // expect(res.status).toEqual(200);
    // expect(res.body.data.length).toEqual(2);
    // expect(res.body.data[0].active).toEqual(12);
    // expect(res.body.data[0].inactive).toEqual(7);
    // expect(res.body.data[1].active).toEqual(15);
    // expect(res.body.data[1].inactive).toEqual(9);
    // expect(res.body.meta.count).toEqual(4);
  });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
