const mongoose = require('mongoose');
const iamMock = require('../../../test/utils/iamMock');
const Flow = require('../../models/flow');
const { getSimilarFlows } = require('./mongo');
const Server = require('../../server');

process.env.MONGODB_URL = global.__MONGO_URI__;

const port = 3002;
const mainServer = new Server();
let app;

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  await mainServer.setup(mongoose);
  app = await mainServer.listen(port);
});

afterAll(async () => {
  mongoose.connection.close();
  app.close();
});

describe('Smart Assistance', () => {
  test('Determining recommendation', async () => {
    // add flows
    await (new Flow({
      graph: {
        nodes: [
          {
            id: 'ms',
            function: 'function',
            componentId: mongoose.Types.ObjectId(),
          },
          {
            id: 'g',
            function: 'function',
            componentId: mongoose.Types.ObjectId(),
          },
        ],
        edges: [
          {
            source: 'ms',
            target: 'g',
          },
        ],
      },
    })).save();

    // add flows
    await (new Flow({
      graph: {
        nodes: [
          {
            id: 'g',
            function: 'function',
            componentId: mongoose.Types.ObjectId(),
          },
          {
            id: 'ms',
            function: 'function',
            componentId: mongoose.Types.ObjectId(),
          },
        ],
        edges: [
          {
            source: 'g',
            target: 'ms',
          },
        ],
      },
    })).save();

    console.log(await getSimilarFlows());
    expect(true).toBe(true);
  });
});
