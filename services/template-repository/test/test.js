/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3001;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock.js');
const token = require('./utils/tokens');
const { getOrphanedTemplates } = require('../app/api/controllers/mongo');
const { reportHealth } = require('../app/utils/eventBus');
const {
  gdprAnonymise, cleanupOrphans,
} = require('../app/utils/handlers');
const FlowTemplate = require('../app/models/flowTemplate');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let template1;
let template2;
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
  test('should not be able to get templates without login', async () => {
    const res = await request.get('/templates');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to get specific templates without login', async () => {
    const res = await request.get('/templates/123456789012');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to add templates without login', async () => {
    const res = await request
      .post('/templates')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'template',
        name: 'WiceToSnazzy',
        status: 'active',
        description: 'A description',
      });
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to delete templates without login', async () => {
    const res = await request
      .delete('/templates/TestOIHID')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });
});

describe('Permissions', () => {
  test('should not be able to get all templates without permissions', async () => {
    const res = await request
      .get('/templates')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to get a single template without permissions', async () => {
    const res = await request
      .get('/templates/5ca5c44c187c040010a9bb8b')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to post a template without permissions', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
        description: 'This content should be irrelevant',
        graph: {},
      });
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to patch a template without permissions', async () => {
    const res = await request
      .patch('/templates/5ca5c44c187c040010a9bb8b')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
        description: 'This content should be irrelevant',
        graph: {},
      });
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to delete a template without permissions', async () => {
    const res = await request
      .delete('/templates/5ca5c44c187c040010a9bb8b')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should not be able to generate a flow without permissions', async () => {
    const res = await request
      .post('/templates/5ca5c44c187c040010a9bb8b/generate')
      .set('Authorization', 'Bearer unpermitToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });
});

describe('Template Validation', () => {
  test('should refuse a template missing a graph', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
        description: 'Should throw an error because there is no graph',
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toEqual('Flow Templates require a graph.');
  });

  test('should refuse a template missing nodes', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
        description: 'Should throw an error because there are no nodes',
        graph: {},
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toEqual('Flow Templates require at least one node.');
  });

  test('should refuse a template with malformed nodes', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
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
    expect(res.body.errors[0].message).toEqual('Flow Template nodes require a function.');
    expect(res.body.errors[1].message).toEqual('Flow Template nodes require a componentId.');
    expect(res.body.errors[2].message).toEqual('Flow Template nodes require an id.');
  });

  test('should refuse a template with several nodes but no edges', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
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
    expect(res.body.errors[0].message).toEqual('Cast to ObjectId failed for value "IncorrectSecret" (type string) at path "credentials_id"');
    expect(res.body.errors[1].message).toEqual('Cast to ObjectId failed for value "abc" (type string) at path "componentId"');
    expect(res.body.errors[2].message).toEqual('Flow Templates with more than one node require edges.');
  });

  test('should refuse a template with malformed edges', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
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
    expect(res.body.errors[0].message).toEqual('Flow Template edges require a target.');
    expect(res.body.errors[1].message).toEqual('Flow Template edges require a source.');
    expect(res.body.errors[2].message).toEqual('Edge source with id "undefined" could not be found among nodes.');
    expect(res.body.errors[3].message).toEqual('Edge target with id "undefined" could not be found among nodes.');
    expect(res.body.errors[4].message).toEqual('Edge source with id "NotANode" could not be found among nodes.');
    expect(res.body.errors[5].message).toEqual('Edge target with id "NotANode2" could not be found among nodes.');
  });

  test('should refuse a template with malformed minor attributes', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
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
    expect(res.body.errors).toHaveLength(3);
    expect(res.body.errors[0].message).toEqual('Flow Template owners require a type.');
    expect(res.body.errors[1].message).toEqual('Flow Template owners require an id.');
    expect(res.body.errors[2].message).toEqual('Invalid cron expression.');
  });

  test('should refuse a template with too long attribute values', async () => {
    const res = await request
      .post('/templates')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
        description: 'Should throw an error for just about every single field due to length',
        owners: [
          { id: '01234567890123456789012345678901', type: '01234567890123456789012345678901' },
        ],
        graph: {
          nodes: [
            {
              id: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
              name: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
              function: '01234567890123456789012345678901',
              componentId: '5ca5c44c187c040010a9bb8b',
            },
            {
              id: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
              name: '01234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
              function: '01234567890123456789012345678901',
              componentId: '5ca5c44c187c040010a9bb8c',
            },
          ],
          edges: [
            {
              id: '0123456789012345678901234567890101234567890123456789012345678901012345678901234567890123456789010123456789012345678901234567890101234567890123456789012345678901',
              source: '01234567890123456789012345678901',
              target: '01234567890123456789012345678901',
            },
          ],
        },
      });
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(11);
    expect(res.body.errors[0].message).toEqual('Path `id` (`01234567890123456789012345678901`) is longer than the maximum allowed length (30).');
  });

  test('should refuse a template according to the same rules when patching instead of posting', async () => {
    const tempTemplate = {
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

    const storeTemplate = new FlowTemplate(tempTemplate);
    const result = await storeTemplate.save();
    const tempTempId = (result._doc._id.toString());

    const res = await request
      .patch(`/templates/${tempTempId}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        name: 'emptyTemplate',
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
    expect(res.body.errors).toHaveLength(11);

    const delResponse = await FlowTemplate.findOneAndDelete({ _id: tempTempId }).lean();
  });
});

describe('Template Operations', () => {
  test('should add a template', async () => {
    const res = await request
      .post('/templates')
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
              authorization: {
                authType: 'OA2_AUTHORIZATION_CODE',
                authClientId: '5ca5c44c187c040010a9bb8b',
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

    // check authorization fields
    expect(j.data.graph.nodes[0].authorization).toHaveProperty('authType');
    expect(j.data.graph.nodes[0].authorization).toHaveProperty('authClientId');

    template1 = j.data.id;
  });

  test('should get the new template', async () => {
    const res = await request
      .get(`/templates/${template1}`)
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

  test('should not show the template to another users getAll', async () => {
    const res = await request
      .get('/templates/')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
  });

  test('should not show the template to another users get', async () => {
    const res = await request
      .get('/templates/123456789012')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('Template not found');
  });

  test('should return 400 when attempting to get an invalid id', async () => {
    const res = await request
      .get('/templates/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
  });

  test('should return 404 when getting a non-existent template', async () => {
    const res = await request
      .get('/templates/123456789012')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('Template not found');
  });

  test('should add a second template', async () => {
    const res = await request
      .post('/templates')
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
    template2 = j.data.id;
  });

  test('should get all templates, filtered by status', async () => {
    const res = await request
      .get('/templates')
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

  test('should get all templates, filtered by user', async () => {
    const res = await request
      .get('/templates')
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

  test('should get all templates, filtered by type', async () => {
    const res = await request
      .get('/templates')
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

  test('should get all templates, using a search', async () => {
    const res = await request
      .get('/templates')
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

  test('should update template', async () => {
    const res = await request
      .patch(`/templates/${template1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        type: 'template',
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

  /* test('should stop a flow', async () => {
    const res = await request
      .post(`/templates/${template1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = res.body;
    expect(j).not.toBeNull();
    expect(j.data).toHaveProperty('id');
    expect(j.data).toHaveProperty('status');
    expect(j.data.id).toEqual(template1);
    expect(j.data.status).toEqual('stopping');
  }); */

  /* test('should refuse to stop an already stopping flow', async () => {
    const res = await request
      .post(`/templates/${template1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(409);
  }); */

  /* test('handle a flow.stopped event', async () => {
    await flowStopped(template1);

    const flow = await Flow.findOne({ _id: template1 }).lean();
    expect(flow.status).toEqual('inactive');
  }); */

  test('handle a user delete event', async () => {
    await gdprAnonymise('dude');

    const template = await FlowTemplate.findOne({ _id: template1 }).lean();
    expect(template.owners).toHaveLength(1);
    expect(template.owners.find((owner) => (owner.id === 'dude'))).toEqual(undefined);
  });

  /* test('should refuse to stop an inactive flow', async () => {
    const res = await request
      .post(`/templates/${template1}/stop`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');

    expect(res.status).toEqual(409);
  }); */

  test('should return 400 when attempting to update an invalid id', async () => {
    const res = await request
      .patch('/templates/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.body).not.toBeNull();
  });

  test('should not be able to update a non-existent template', async () => {
    const res = await request
      .patch('/templates/123456789012')
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
    expect(res.body.errors[0].message).toEqual('Template not found');
  });
});

describe('Cleanup', () => {
  test('should return 400 when attempting to delete an invalid id', async () => {
    const res = await request
      .delete('/templates/SDSADGSDGH')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(400);
    expect(res.text).not.toBeNull();
  });

  test('should delete the first template', async () => {
    const res = await request
      .delete(`/templates/${template1}`)
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    expect(res.body.msg).toEqual('Template was successfully deleted');
  });

  test('should delete the second template', async () => {
    const res = await request
      .delete(`/templates/${template2}`)
      .set('Authorization', 'Bearer guestToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();
    expect(res.body.msg).toEqual('Template was successfully deleted');
  });

  test('should return 404 when attempting to get the just deleted template', async () => {
    const res = await request
      .get(`/templates/${template1}`)
      .set('Authorization', 'Bearer adminToken');
    expect(res.status).toEqual(404);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('Template not found');
  });
});

describe('Maintenance functions', () => {
  beforeAll(async () => {
    const orphanTemplate = {
      type: 'ordinary',
      name: 'EmptyTemplate',
      description: 'A functional template that lacks owners',
      status: 'published',
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

    const storeTemplate = new FlowTemplate(orphanTemplate);
    await storeTemplate.save();
  });

  test('should find an orphaned template', async () => {
    const orphans = await getOrphanedTemplates();

    expect(orphans.length).toEqual(1);
    expect(orphans[0].name).toEqual('EmptyTemplate');
  });

  test('should unpublish orphaned templates', async () => {
    const count = await cleanupOrphans();

    expect(count).toEqual(1);
  });
});
