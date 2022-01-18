process.env.SMART_ASSISTANCE_MIN_SIMILARITY_SCORE = 0.1;
process.env.MONGODB_URL = global.__MONGO_URI__;

const mongoose = require('mongoose');
const iamMock = require('../../../test/utils/iamMock');
const Flow = require('../../models/flow');
const { getSimilarFlows } = require('./mongo');
const Server = require('../../server');
const generateGraph = require('../../utils/generate-graph');

const port = 3002;
const mainServer = new Server();
let app;

const dummyConnectors = {
  c1: {
    componentId: mongoose.Types.ObjectId(),
  },
  c2: {
    componentId: mongoose.Types.ObjectId(),
  },
  c3: {
    componentId: mongoose.Types.ObjectId(),
  },
  c4: {
    componentId: mongoose.Types.ObjectId(),
  },
  c5: {
    componentId: mongoose.Types.ObjectId(),
  },
  c6: {
    componentId: mongoose.Types.ObjectId(),
  },
  c7: {
    componentId: mongoose.Types.ObjectId(),
  },
};

async function generateDummyFlow(flowString) {
  return (new Flow({
    graph: generateGraph(dummyConnectors, flowString),
  })).save();
}

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
  test('find similar flows/graphs', async () => {
    // generate dummy flows
    await generateDummyFlow(`
      step1.c1.trigger -> step2.c2.action, 
      step1.c1.trigger -> step3.c3.action, 
      step3.c3.action -> step4.c4.action,
      step4.c4.action -> step5.c4.finish
    `);

    await generateDummyFlow(`
      step1.c4.trigger -> step3.c1.action,
      step1.c4.trigger -> step4.c2.action,
      step1.c4.trigger -> step5.c3.action,
      step1.c4.trigger -> step2.c5.action,
      step1.c4.trigger -> step6.c4.action,
      step1.c4.trigger -> step7.c7.action
    `);

    await generateDummyFlow(`
      step1.c4.trigger -> step2.c5.action,
      step2.c5.action -> step3.c6.action
    `);

    await generateDummyFlow(`
      step1.c4.trigger -> step2.c5.action,
      step2.c5.action -> step3.c1.action
    `);

    const baseFlow = await generateDummyFlow(`
      step1.c4.trigger -> step2.c5.action,
      step2.c5.action -> step3.c1.action
    `);

    const similarFlows = await getSimilarFlows(baseFlow._id);

    expect(similarFlows.length).toBe(3);
    expect(similarFlows[0].score).toBe(1);
    expect(similarFlows[1].score).toBe(0.5);
    expect(similarFlows[2].score).toBeCloseTo(0.166);
  });
});
