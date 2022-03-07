/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3001;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock');
const token = require('./utils/tokens');
const { getOrphanedFlows } = require('../app/api/controllers/mongo');
const { reportHealth } = require('../app/utils/eventBus');
const {
  flowStarted, flowStopped, flowFailed, gdprAnonymise, cleanupOrphans,
} = require('../app/utils/handlers');
const Flow = require('../app/models/flow');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let flowId1;
let flowId2;
let app;

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
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

describe('Login Security', () => {
  test('should not be able to get flows without login', async () => {
    const res = await request.get('/flows');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to get specific flows without login', async () => {
    const res = await request.get('/flows/123456789012');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to add flows without login', async () => {
    const res = await request
      .post('/flows')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'WiceToSnazzy',
        status: 'active',
        description: 'A description',
      });
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to delete flows without login', async () => {
    const res = await request
      .delete('/flows/TestOIHID')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });
});

describe('Permissions', () => {
  test('should not be able to get all flows without permissions', async () => {
    const res = await request
      .get('/flows')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to get a single flow without permissions', async () => {
    const res = await request
      .get('/flows/5ca5c44c187c040010a9bb8b')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to post a flow without permissions', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'This content should be irrelevant',
        graph: {},
      });
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to patch a flow without permissions', async () => {
    const res = await request
      .patch('/flows/5ca5c44c187c040010a9bb8b')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'This content should be irrelevant',
        graph: {},
      });
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to delete a flow without permissions', async () => {
    const res = await request
      .delete('/flows/5ca5c44c187c040010a9bb8b')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to start a flow without permissions', async () => {
    const res = await request
      .post('/flows/5ca5c44c187c040010a9bb8b/start')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to stop a flow without permissions', async () => {
    const res = await request
      .post('/flows/5ca5c44c187c040010a9bb8b/stop')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });
});

describe('Flow Validation', () => {
  test('should refuse a flow missing a graph', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'Should throw an error because there is no graph',
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toEqual('Flows require a graph.');
  });

  test('should refuse a flow missing nodes', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'Should throw an error because there are no nodes',
        graph: {},
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toEqual('Flows require at least one node.');
  });

  test('should refuse a flow with malformed nodes', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'Should throw several errors because the node lacks required attributes',
        graph: {
          nodes: [
            {
              name: 'nodeName',
            },
          ],
        },
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(3);
    expect(res.body.errors[0].message).toEqual('Flow nodes require a function.');
    expect(res.body.errors[1].message).toEqual('Flow nodes require a componentId.');
    expect(res.body.errors[2].message).toEqual('Flow nodes require an id.');
  });

  test('should refuse a flow with several nodes but no edges', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'Should throw an error each for missing edges and invalid componentId',
        graph: {
          nodes: [
            {
              id: 'NodeId',
              name: 'nodeName',
              function: 'function',
              componentId: '5ca5c44c187c040010a9bb8b',
              credentials_id: 'IncorrectSecret',
            },
            {
              id: 'NodeId',
              name: 'nodeName',
              function: 'function',
              componentId: 'abc',
            },
          ],
        },
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(3);

    // const bodyErrors = JSON.parse(JSON.stringify(res.body.errors));
    // bodyErrors.sort((a, b) => ((a.message > b.message) ? -1 : 1));
    //
    // expect(bodyErrors[0].message).toEqual('Flows with more than one node require edges.');
    // expect(bodyErrors[1].message).toEqual('Cast to ObjectID failed for value "abc" at path "componentId"');
    // expect(bodyErrors[2].message).toEqual('Cast to ObjectID failed for value "IncorrectSecret" at path "credentials_id"');
  });

  test('should refuse a flow with malformed edges', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'Should throw an error each for target/source and missing attributes',
        graph: {
          nodes: [
            {
              id: 'NodeId',
              name: 'nodeName',
              function: 'function',
              componentId: '5ca5c44c187c040010a9bb8b',
            },
            {
              id: 'NodeId2',
              name: 'nodeName',
              function: 'function',
              componentId: '5ca5c44c187c040010a9bb8c',
            },
          ],
          edges: [
            {
              id: 'EmptyEdge',
            },
            {
              source: 'NotANode',
              target: 'NodeId',
            },
            {
              source: 'NodeId2',
              target: 'NotANode2',
            },
          ],
        },
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(6);
    expect(res.body.errors[0].message).toEqual('Flow edges require a target.');
    expect(res.body.errors[1].message).toEqual('Flow edges require a source.');
    expect(res.body.errors[2].message).toEqual('Edge source with id "undefined" could not be found among nodes.');
    expect(res.body.errors[3].message).toEqual('Edge target with id "undefined" could not be found among nodes.');
    expect(res.body.errors[4].message).toEqual('Edge source with id "NotANode" could not be found among nodes.');
    expect(res.body.errors[5].message).toEqual('Edge target with id "NotANode2" could not be found among nodes.');
  });

  test('should refuse a flow with malformed minor attributes', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'Should throw an error each for cron, status, and owner',
        cron: 'abcde',
        status: 'active',
        owners: [
          { id: '12345' },
          { type: 'user' },
        ],
        graph: {
          nodes: [
            {
              id: 'NodeId',
              name: 'nodeName',
              function: 'function',
              componentId: '5ca5c44c187c040010a9bb8b',
            },
            {
              id: 'NodeId2',
              name: 'nodeName',
              function: 'function',
              componentId: '5ca5c44c187c040010a9bb8c',
            },
          ],
          edges: [
            {
              source: 'NodeId2',
              target: 'NodeId',
            },
          ],
        },
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(4);
    expect(res.body.errors[0].message).toEqual('Flow owners require a type.');
    expect(res.body.errors[1].message).toEqual('Flow owners require an id.');
    expect(res.body.errors[2].message).toEqual('Flow status cannot be set manually. Use the flow start/stop end points instead.');
    expect(res.body.errors[3].message).toEqual('Invalid cron expression.');
  });

  // test('should refuse a flow with too long attribute values', async () => {
  //   const res = await request
  //     .post('/flows')
  //     .set('Authorization', 'Bearer adminToken')
  //     .set('accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .send({
  //       name: 'emptyFlow',
  //       description: 'Should throw an error for just about every single field due to length',
  //       owners: [
  //         { id: '01234567890123456789012345678901', type: '01234567890123456789012345678901' },
  //       ],
  //       graph: {
  //         nodes: [
  //           {
  //             id: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
  //             name: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
  //             function: '01234567890123456789012345678901',
  //             componentId: '5ca5c44c187c040010a9bb8b',
  //           },
  //           {
  //             id: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
  //             name: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
  //             function: '01234567890123456789012345678901',
  //             componentId: '5ca5c44c187c040010a9bb8c',
  //           },
  //         ],
  //         edges: [
  //           {
  //             id: '0123456789012345678901234567890101234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
  //             source: '01234567890123456789012345678901',
  //             target: '01234567890123456789012345678901',
  //           },
  //         ],
  //       },
  //     });
  //   expect(res.status).toEqual(400);
  //   expect(res.body.errors).toHaveLength(11);
  //   expect(res.body.errors[0].message).toEqual('Path `id` (`01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901`) is longer than the maximum allowed length (30).');
  // });

  test('should refuse a flow according to the same rules when patching instead of posting', async () => {
    const tempFlow = {
      graph: {
        nodes: [
          {
            id: 'Testnode',
            function: 'function',
            componentId: '5ca5c44c187c040010a9bb8b',
          },
        ],
      },
      owners: [
        { id: 'TestAdmin', type: 'user' },
      ],
    };

    const storeFlow = new Flow(tempFlow);
    const result = await storeFlow.save();
    const tempFlowId = (result._doc._id.toString());

    const res = await request
      .patch(`/flows/${tempFlowId}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyFlow',
        description: 'Should throw a variety of errors for most fields',
        cron: 'abcde',
        status: 'active',
        owners: [
          { id: '12345' },
          { type: 'user' },
        ],
        graph: {
          nodes: [
            {
              id: 'NodeId',
              name: 'nodeName',
              componentId: 'abcd',
            },
            {
              id: 'NodeId2',
              name: 'nodeName',
              function: 'function',
              componentId: '5ca5c44c187c040010a9bb8c',
            },
          ],
          edges: [
            {
              id: 'EmptyEdge',
            },
            {
              source: 'NotANode',
              target: 'NodeId',
            },
            {
              source: 'NodeId2',
              target: 'NotANode2',
            },
          ],
        },
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(12);

    const delResponse = await Flow.findOneAndDelete({ _id: tempFlowId }).lean();
  });
});

describe('Flow Operations', () => {
  test('should add a flow', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'ordinary',
        name: 'WiceToSnazzy',
        description: 'A description',
        graph: {
          nodes: [
            {
              id: 'NodeOne',
              componentId: '5ca5c44c187c040010a9bb8b',
              function: 'getPersonsPolling',
              credentials_id: '5ca5c44c187c040010a9bb8c',
              fields: {
                username: 'TestName',
                password: 'TestPass',
              },
            },
            {
              id: 'NodeTwo',
              componentId: '5ca5c44c187c040010a9bb8c',
              function: 'transformTestToOih',
            },
          ],
          edges: [
            {
              source: 'NodeOne',
              target: 'NodeTwo',
            },
          ],
        },
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');

    flowId1 = j.data.id;
  });

  test('should get the new flow', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const j = res.body;

    expect(j).not.toBeNull();
    expect(j.data.name).toEqual('WiceToSnazzy');
    expect(j.data).toHaveProperty('id');
    expect(j.data).toHaveProperty('graph');
    expect(j.data).toHaveProperty('createdAt');
    expect(j.data).toHaveProperty('updatedAt');
    expect(j.data.createdAt).not.toBeNull();
    expect(j.data.updatedAt).not.toBeNull();
    expect(j.data.graph).toHaveProperty('nodes');
    expect(j.data.graph).toHaveProperty('edges');
    expect(j.data.graph.nodes[0].id).toEqual('NodeOne');
    expect(j.data.graph.nodes[0].componentId).toEqual('5ca5c44c187c040010a9bb8b');
    expect(j.data.graph.nodes[0].function).toEqual('getPersonsPolling');
    expect(j.data.graph.nodes[0].credentials_id).toEqual('5ca5c44c187c040010a9bb8c');
    expect(j.data.graph.nodes[0].fields.username).toEqual('TestName');
    expect(j.data.graph.nodes[0].fields.password).toEqual('TestPass');
    expect(j.data.graph.edges[0].source).toEqual('NodeOne');
    expect(j.data.graph.edges[0].target).toEqual('NodeTwo');
    expect(j.data.owners[0].id).toEqual('TestAdmin');
    expect(j.data.owners[0].type).toEqual('user');
  });

  test('should not show the flow to another users getAll', async () => {
    const res = await request
      .get('/flows/')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(200);
    expect(res.body.data).toHaveLength(0);
  });

  test('should not show the flow to another users get', async () => {
    const res = await request
      .get('/flows/123456789012')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('No flow found');
  });

  test('should return 400 when attempting to get an invalid id', async () => {
    const res = await request
      .get('/flows/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
  });

  test('should return 404 when getting a non-existent flow', async () => {
    const res = await request
      .get('/flows/123456789012')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('No flow found');
  });

  test('should add a second flow', async () => {
    const res = await request
      .post('/flows')
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'long-running',
        name: 'SnazzyToWice',
        description: 'Different content',
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
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toBeNull();
    const j = res.body;
    expect(j).not.toBeNull();

    expect(j.data).toHaveProperty('id');
    flowId2 = j.data.id;
  });

  test('should get all flows, filtered by status', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[status]': 0,
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(2);
    expect(j.data[0]).toHaveProperty('id');
  });

  test('should get all flows, filtered by user', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[user]': guestId,
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('id');
  });

  test('should get all flows, filtered by type', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[type]': 'ordinary',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('id');
  });

  test('should get all flows, using a search', async () => {
    const res = await request
      .get('/flows')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        search: 'desc',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('id');
  });

  test('should update flow', async () => {
    const res = await request
      .patch(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'NewName',
        description: 'A description',
        owners: [
          {
            type: 'user',
            id: 'dude',
          },
        ],
      });
    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = res.body;
    expect(j).not.toBeNull();

    expect(j.data).toHaveProperty('id');
  });

  test('should start a flow', async () => {
    const res = await request
      .post(`/flows/${flowId1}/start`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');
    expect(j.data).toHaveProperty('status');
    expect(j.data.id).toEqual(flowId1);
    expect(j.data.status).toEqual('starting');
  });

  test('handle a flow.started event', async () => {
    await flowStarted(flowId1);

    const flow = await Flow.findOne({ _id: flowId1 }).lean();
    expect(flow.status).toEqual('active');
  });

  test('should refuse to update an active flow', async () => {
    const res = await request
      .patch(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'NewName',
        description: 'A description',
        owners: [
          {
            type: 'user',
            id: 'dude',
          },
        ],
      });
    expect(res.status).toEqual(409);
  });

  test('should stop a flow', async () => {
    const res = await request
      .post(`/flows/${flowId1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');
    expect(j.data).toHaveProperty('status');
    expect(j.data.id).toEqual(flowId1);
    expect(j.data.status).toEqual('stopping');
  });

  test('handle a flow.stopped event', async () => {
    await flowStopped(flowId1);

    const flow = await Flow.findOne({ _id: flowId1 }).lean();
    expect(flow.status).toEqual('inactive');
  });

  test('handle a flow.failed event', async () => {
    const failedFlow = new Flow({
      name: 'SnazzyToWice',
      description: 'Different content',
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
    });

    const savedFailedFlow = await failedFlow.save();
    expect(savedFailedFlow.status).toEqual('starting');

    const response = await flowFailed(savedFailedFlow._id.toString());
    expect(response).toHaveProperty('name', 'SnazzyToWice');
    expect(response).toHaveProperty('status', 'stopping');
    expect(response).toHaveProperty('id');

    const flow = await Flow.findOne({ _id: savedFailedFlow._id.toString() }).lean();
    expect(flow.status).toEqual('stopping');

    await Flow.deleteOne({ _id: savedFailedFlow._id.toString() });
  });

  test('handle a user delete event', async () => {
    await gdprAnonymise('dude');

    const flow = await Flow.findOne({ _id: flowId1 }).lean();
    expect(flow.owners).toHaveLength(1);
    expect(flow.owners.find((owner) => (owner.id === 'dude'))).toEqual(undefined);
  });

  test('should return 400 when attempting to update an invalid id', async () => {
    const res = await request
      .patch('/flows/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
  });

  test('should not be able to update a non-existent flow', async () => {
    const res = await request
      .patch('/flows/123456789012')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'flow',
        name: 'NewName',
        description: 'A description',
      });
    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('Flow not found');
  });
});

describe('Cleanup', () => {
  test('should return 400 when attempting to delete an invalid id', async () => {
    const res = await request
      .delete('/flows/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.text).not.toBeNull();
  });

  test('should delete the first flow', async () => {
    const res = await request
      .delete(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    expect(res.body.msg).toEqual('Flow was successfully deleted');
  });

  test('should delete the second flow', async () => {
    const res = await request
      .delete(`/flows/${flowId2}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    expect(res.body.msg).toEqual('Flow was successfully deleted');
  });

  test('should return 404 when attempting to get the just deleted flow', async () => {
    const res = await request
      .get(`/flows/${flowId1}`)
      .set('Authorization', 'Bearer adminToken');
    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('No flow found');
  });
});

describe('Maintenance functions', () => {
  beforeAll(async () => {
    const orphanFlow = {
      type: 'ordinary',
      name: 'EmptyFlow',
      description: 'A functional flow that lacks owners',
      status: 'active',
      graph: {
        nodes: [
          {
            id: 'NodeOne',
            componentId: '5ca5c44c187c040010a9bb8b',
            function: 'getPersonsPolling',
            credentials_id: '5ca5c44c187c040010a9bb8c',
            fields: {
              username: 'TestName',
              password: 'TestPass',
            },
          },
          {
            id: 'NodeTwo',
            componentId: '5ca5c44c187c040010a9bb8c',
            function: 'transformTestToOih',
          },
        ],
        edges: [
          {
            source: 'NodeOne',
            target: 'NodeTwo',
          },
        ],
      },
    };

    const storeFlow = new Flow(orphanFlow);
    await storeFlow.save();
  });

  test('should find an orphaned flow', async () => {
    const orphans = await getOrphanedFlows();

    expect(orphans.length).toEqual(1);
    expect(orphans[0].name).toEqual('EmptyFlow');
  });

  test('should stop all active orphaned flows', async () => {
    const count = await cleanupOrphans();

    expect(count).toEqual(1);
  });
});
