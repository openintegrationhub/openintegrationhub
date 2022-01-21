process.env.SMART_ASSISTANCE_MIN_SIMILARITY_SCORE = 0.1;
process.env.MONGODB_URL = global.__MONGO_URI__;

const mongoose = require('mongoose');

const request = require('supertest')('http://localhost:3002');
const iamMock = require('../../../test/utils/iamMock');
const Flow = require('../../models/flow');
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

    const { data } = (await request
      .get(`/flows/recommend/${baseFlow._id}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(200)).body;

    expect(data.length).toBe(3);
    expect(data[0].score).toBe(1);
    expect(data[1].score).toBe(0.5);
    expect(data[2].score).toBeCloseTo(0.166);
  });

  test('find flow examples by componentIds', async () => {
    const {
      c1, c2, c3, c4, c5, c6, c7,
    } = dummyConnectors;

    function generateQueryString(componentIds) {
      let counter = 0;
      return componentIds.reduce((a, b) => `${a}componentIds[${counter++}]=${b}&`, '?');
    }

    await request
      .get('/flows/recommend?components[0]=c1')
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(400);

    await request
      .get('/flows/recommend?componentIds')
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(400);

    await request
      .get('/flows/recommend?componentIds[0]=c1')
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(400);

    await request
      .get(`/flows/recommend?componentIds[0]=${mongoose.Types.ObjectId()}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(200);

    let data = (await request
      .get(`/flows/recommend${generateQueryString([c1.componentId, c2.componentId])}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(200)).body.data;

    expect(data.length).toBe(2);

    for (const flow of data) {
      expect(flow.graph.nodes.find((n) => n.componentId === c1.componentId.toString())).toBeDefined();
      expect(flow.graph.nodes.find((n) => n.componentId === c2.componentId.toString())).toBeDefined();
    }

    data = (await request
      .get(`/flows/recommend${generateQueryString([c1.componentId, c2.componentId, c2.componentId])}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(200)).body.data;

    expect(data.length).toBe(2);

    for (const flow of data) {
      expect(flow.graph.nodes.find((n) => n.componentId === c1.componentId.toString())).toBeDefined();
      expect(flow.graph.nodes.find((n) => n.componentId === c2.componentId.toString())).toBeDefined();
    }

    data = (await request
      .get(`/flows/recommend${generateQueryString([c7.componentId])}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(200)).body.data;

    expect(data.length).toBe(1);

    for (const flow of data) {
      expect(flow.graph.nodes.find((n) => n.componentId === c7.componentId.toString())).toBeDefined();
    }

    data = (await request
      .get(`/flows/recommend${generateQueryString([c1.componentId, c2.componentId, c3.componentId, c4.componentId])}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(200)).body.data;

    expect(data.length).toBe(2);

    for (const flow of data) {
      expect(flow.graph.nodes.find((n) => n.componentId === c1.componentId.toString())).toBeDefined();
      expect(flow.graph.nodes.find((n) => n.componentId === c2.componentId.toString())).toBeDefined();
      expect(flow.graph.nodes.find((n) => n.componentId === c3.componentId.toString())).toBeDefined();
      expect(flow.graph.nodes.find((n) => n.componentId === c4.componentId.toString())).toBeDefined();
    }

    data = (await request
      .get(`/flows/recommend${generateQueryString([
        c1.componentId,
        c2.componentId,
        c3.componentId,
        c4.componentId,
        c5.componentId,
        c6.componentId,
        c7.componentId,
      ])}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .expect(200)).body.data;

    expect(data.length).toBe(0);
  });
});
