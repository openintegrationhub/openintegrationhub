/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3009;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock.js');
const token = require('./utils/tokens');
const { getOrphanedProvenanceEvents } = require('../app/api/controllers/mongo');
const { reportHealth } = require('../app/utils/eventBus');

const ProvenanceEvent = require('../app/models/ProvenanceEvent');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let ProvenanceEventId1;
let ProvenanceEventId2;
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
  test('should not be able to get ProvenanceEvents without login', async () => {
    const res = await request.get('/ProvenanceEvents');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to get specific ProvenanceEvents without login', async () => {
    const res = await request.get('/ProvenanceEvents/123456789012');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to add ProvenanceEvents without login', async () => {
    const res = await request
      .post('/ProvenanceEvents')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'ProvenanceEvent',
        name: 'WiceToSnazzy',
        status: 'active',
        description: 'A description',
      });
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to delete ProvenanceEvents without login', async () => {
    const res = await request
      .delete('/ProvenanceEvents/TestOIHID')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });
});

describe('Permissions', () => {
  test('should not be able to get all ProvenanceEvents without permissions', async () => {
    const res = await request
      .get('/ProvenanceEvents')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });
});

describe('ProvenanceEvent Operations', () => {
  test('should add a ProvenanceEvent', async () => {
    const res = await request
      .post('/events')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
      });
    expect(res.status).toEqual(201);
    expect(res.text).not.toHaveLength(0);
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');

    ProvenanceEventId1 = j.data.id;
  });

  test('should get the new ProvenanceEvent', async () => {
    const res = await request
      .get(`/ProvenanceEvents/${ProvenanceEventId1}`)
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

  test('should not show the ProvenanceEvent to another users getAll', async () => {
    const res = await request
      .get('/ProvenanceEvents/')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('No ProvenanceEvents found');
  });

  test('should not show the ProvenanceEvent to another users get', async () => {
    const res = await request
      .get('/ProvenanceEvents/123456789012')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('No ProvenanceEvent found');
  });

  test('should return 400 when attempting to get an invalid id', async () => {
    const res = await request
      .get('/ProvenanceEvents/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
  });

  test('should return 404 when getting a non-existent ProvenanceEvent', async () => {
    const res = await request
      .get('/ProvenanceEvents/123456789012')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('No ProvenanceEvent found');
  });

  test('should add a second ProvenanceEvent', async () => {
    const res = await request
      .post('/ProvenanceEvents')
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
    ProvenanceEventId2 = j.data.id;
  });

  test('should get all ProvenanceEvents, filtered by status', async () => {
    const res = await request
      .get('/ProvenanceEvents')
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

  test('should get all ProvenanceEvents, filtered by user', async () => {
    const res = await request
      .get('/ProvenanceEvents')
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

  test('should get all ProvenanceEvents, filtered by type', async () => {
    const res = await request
      .get('/ProvenanceEvents')
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

  test('should get all ProvenanceEvents, using a search', async () => {
    const res = await request
      .get('/ProvenanceEvents')
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

  test('should update ProvenanceEvent', async () => {
    const res = await request
      .patch(`/ProvenanceEvents/${ProvenanceEventId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'ProvenanceEvent',
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

  test('should start a ProvenanceEvent', async () => {
    const res = await request
      .post(`/ProvenanceEvents/${ProvenanceEventId1}/start`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');
    expect(j.data).toHaveProperty('status');
    expect(j.data.id).toEqual(ProvenanceEventId1);
    expect(j.data.status).toEqual('starting');
  });

  test('should refuse to start an already starting ProvenanceEvent', async () => {
    const res = await request
      .post(`/ProvenanceEvents/${ProvenanceEventId1}/start`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(409);
  });

  test('handle a ProvenanceEvent.started event', async () => {
    await ProvenanceEventStarted(ProvenanceEventId1);

    const ProvenanceEvent = await ProvenanceEvent.findOne({ _id: ProvenanceEventId1 }).lean();
    expect(ProvenanceEvent.status).toEqual('active');
  });

  test('should refuse to start an already active ProvenanceEvent', async () => {
    const res = await request
      .post(`/ProvenanceEvents/${ProvenanceEventId1}/start`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(409);
  });

  test('should refuse to update an active ProvenanceEvent', async () => {
    const res = await request
      .patch(`/ProvenanceEvents/${ProvenanceEventId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'ProvenanceEvent',
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

  test('should stop a ProvenanceEvent', async () => {
    const res = await request
      .post(`/ProvenanceEvents/${ProvenanceEventId1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');
    expect(j.data).toHaveProperty('status');
    expect(j.data.id).toEqual(ProvenanceEventId1);
    expect(j.data.status).toEqual('stopping');
  });

  test('should refuse to stop an already stopping ProvenanceEvent', async () => {
    const res = await request
      .post(`/ProvenanceEvents/${ProvenanceEventId1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(409);
  });

  test('handle a ProvenanceEvent.stopped event', async () => {
    await ProvenanceEventStopped(ProvenanceEventId1);

    const ProvenanceEvent = await ProvenanceEvent.findOne({ _id: ProvenanceEventId1 }).lean();
    expect(ProvenanceEvent.status).toEqual('inactive');
  });

  test('handle a ProvenanceEvent.failed event', async () => {
    const failedProvenanceEvent = new ProvenanceEvent({
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

    const savedFailedProvenanceEvent = await failedProvenanceEvent.save();
    expect(savedFailedProvenanceEvent.status).toEqual('starting');

    const response = await ProvenanceEventFailed(savedFailedProvenanceEvent._id.toString());
    expect(response).toEqual(true);

    const ProvenanceEvent = await ProvenanceEvent.findOne({ _id: savedFailedProvenanceEvent._id.toString() }).lean();
    expect(ProvenanceEvent.status).toEqual('inactive');

    await ProvenanceEvent.deleteOne({ _id: savedFailedProvenanceEvent._id.toString() });
  });

  test('handle a user delete event', async () => {
    await gdprAnonymise('dude');

    const ProvenanceEvent = await ProvenanceEvent.findOne({ _id: ProvenanceEventId1 }).lean();
    expect(ProvenanceEvent.owners).toHaveLength(1);
    expect(ProvenanceEvent.owners.find(owner => (owner.id === 'dude'))).toEqual(undefined);
  });

  test('should refuse to stop an inactive ProvenanceEvent', async () => {
    const res = await request
      .post(`/ProvenanceEvents/${ProvenanceEventId1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(409);
  });

  test('should return 400 when attempting to update an invalid id', async () => {
    const res = await request
      .patch('/ProvenanceEvents/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
  });

  test('should not be able to update a non-existent ProvenanceEvent', async () => {
    const res = await request
      .patch('/ProvenanceEvents/123456789012')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'ProvenanceEvent',
        name: 'NewName',
        description: 'A description',
      });
    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('ProvenanceEvent not found');
  });
});

describe('Cleanup', () => {
  test('should return 400 when attempting to delete an invalid id', async () => {
    const res = await request
      .delete('/ProvenanceEvents/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.text).not.toBeNull();
  });

  test('should delete the first ProvenanceEvent', async () => {
    const res = await request
      .delete(`/ProvenanceEvents/${ProvenanceEventId1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    expect(res.body.msg).toEqual('ProvenanceEvent was successfully deleted');
  });

  test('should delete the second ProvenanceEvent', async () => {
    const res = await request
      .delete(`/ProvenanceEvents/${ProvenanceEventId2}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    expect(res.body.msg).toEqual('ProvenanceEvent was successfully deleted');
  });

  test('should return 404 when attempting to get the just deleted ProvenanceEvent', async () => {
    const res = await request
      .get(`/ProvenanceEvents/${ProvenanceEventId1}`)
      .set('Authorization', 'Bearer adminToken');
    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('No ProvenanceEvent found');
  });
});

describe('Maintenance functions', () => {
  beforeAll(async () => {
    const orphanProvenanceEvent = {
      type: 'ordinary',
      name: 'EmptyProvenanceEvent',
      description: 'A functional ProvenanceEvent that lacks owners',
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

    const storeProvenanceEvent = new ProvenanceEvent(orphanProvenanceEvent);
    await storeProvenanceEvent.save();
  });

  test('should find an orphaned ProvenanceEvent', async () => {
    const orphans = await getOrphanedProvenanceEvents();

    expect(orphans.length).toEqual(1);
    expect(orphans[0].name).toEqual('EmptyProvenanceEvent');
  });

  test('should stop all active orphaned ProvenanceEvents', async () => {
    const count = await cleanupOrphans();

    expect(count).toEqual(1);
  });
});
