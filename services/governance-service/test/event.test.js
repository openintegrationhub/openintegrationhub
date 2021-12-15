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
const { addProvenanceEvent } = require('../app/api/controllers/mongo');
const { reportHealth } = require('../app/utils/eventBus');

const ProvenanceEvent = require('../app/models/provenanceEvent');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let actedOnBehalfOf1;
let actedOnBehalfOf2;
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
    const res = await request.get('/event');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to get specific ProvenanceEvents without login', async () => {
    const res = await request.get('/event/123456789012');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });
});

describe('Permissions', () => {
  test('should not be able to get all ProvenanceEvents without permissions', async () => {
    const res = await request
      .get('/event')
      .set('Authorization', 'Bearer denyToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json');
    expect(res.status).toEqual(403);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });
});

describe('ProvenanceEvent Operations', () => {
  test('should add a ProvenanceEvent', async () => {
    const newEvent = {
      entity: {
        id: 'aoveu03dv921dvo',
        entityType: 'oihUid',
      },
      activity: {
        id: '30j0hew9kwbnkksfb09',
        activityType: 'ObjectRetrieved',
        used: 'getPersons',
        startedAtTime: '2020-10-19T09:47:11.000Z',
        endedAtTime: '2020-10-19T09:47:15.000Z',
      },
      agent: {
        id: 'w4298jb9q74z4dmjuo',
        agentType: 'Connector',
      },
      actedOnBehalfOf: [
        {
          first: true,
          id: 'w4298jb9q74z4dmjuo',
          agentType: 'Connector',
          actedOnBehalfOf: 'j460ge49qh3rusfuoh',
        },
        {
          id: 'j460ge49qh3rusfuoh',
          agentType: 'User',
          actedOnBehalfOf: 't35fdhtz57586',
        },
        {
          id: 't35fdhtz57586',
          agentType: 'Tenant',
        },
      ],
    };

    let res = await addProvenanceEvent(newEvent);
    res = JSON.parse(JSON.stringify(res));

    expect(res).not.toBeNull();
    expect(res).toHaveProperty('id');

    actedOnBehalfOf1 = res.id;

    delete res.id;
    delete res.createdAt;
    delete res.updatedAt;

    delete res.actedOnBehalfOf[0]._id;
    delete res.actedOnBehalfOf[1]._id;
    delete res.actedOnBehalfOf[2]._id;

    newEvent.activity.generated = [];
    newEvent.activity.id = '30j0hew9kwbnkksfb09';
    newEvent.activity.invalidated = [];

    newEvent.activity.qualifiedAssociation = {};
    newEvent.activity.qualifiedEnd = {};
    newEvent.activity.qualifiedStart = {};
    newEvent.activity.qualifiedUsage = [];

    newEvent.entity.alternateOf = [];
    newEvent.entity.hadPrimarySource = [];
    newEvent.entity.id = 'aoveu03dv921dvo';
    newEvent.entity.wasDerivedFrom = [];

    expect(res).toEqual(newEvent);
  });

  test('should get the new ProvenanceEvent', async () => {
    const res = await request
      .get('/event')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body).not.toBeNull();

    const j = res.body.data[0];

    expect(j.id).toEqual(actedOnBehalfOf1);
  });

  test('should not show the ProvenanceEvent to another users getAll', async () => {
    const res = await request
      .get('/event')
      .set('Authorization', 'Bearer guestToken');

    expect(res.status).toEqual(403);
    expect(res.body).not.toBeNull();
    expect(res.body.errors[0].message).toEqual('MISSING_PERMISSION');
  });

  test('should add a second ProvenanceEvent', async () => {
    const res = await addProvenanceEvent({
      entity: {
        id: 'aoveu03dv921dvo2',
        entityType: 'oihUid',
      },
      activity: {
        id: '30j0hew9kwbnkksfb09',
        activityType: 'ObjectSent',
        used: 'upsertPerson',
        startedAtTime: '2020-10-19T09:48:11.000Z',
        endedAtTime: '2020-10-19T09:48:15.000Z',
      },
      agent: {
        id: 'w4298jb9q74z4dmjuo',
        agentType: 'Connector',
      },
      actedOnBehalfOf: [
        {
          first: true,
          id: 'w4298jb9q74z4dmjuo',
          agentType: 'Connector',
          actedOnBehalfOf: 'PermitGuy',
        },
        {
          id: 'PermitGuy',
          agentType: 'User',
          actedOnBehalfOf: 'testTenant1',
        },
        {
          id: 'testTenant1',
          agentType: 'Tenant',
        },
      ],
    });

    expect(res).not.toBeNull();
    expect(res).toHaveProperty('id');

    actedOnBehalfOf2 = res.id;
  });

  test('should get all ProvenanceEvents, filtered by actedOnBehalfOf', async () => {
    const res = await request
      .get('/event')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[actedOnBehalfOf]': 'j460ge49qh3rusfuoh',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);

    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('id');

    expect(j.data[0].actedOnBehalfOf[0].id).toEqual('w4298jb9q74z4dmjuo');
    expect(j.data[0].actedOnBehalfOf[1].id).toEqual('j460ge49qh3rusfuoh');
  });

  test('should get all ProvenanceEvents, filtered by activityType', async () => {
    const res = await request
      .get('/event')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        'filter[activityType]': 'ObjectRetrieved',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('id');
  });

  test('should get all ProvenanceEvents, filtered by start and end time', async () => {
    const res = await request
      .get('/event')
      .query({
        'page[size]': 5,
        'page[number]': 1,
        from: '2020-10-19T09:48:11.000Z',
        until: '2020-10-19T09:48:15.000Z',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('entity');

    expect(j.data[0].entity.id).toEqual('aoveu03dv921dvo2');
  });

  test('should only get ProvenanceEvents allowed for restricted user', async () => {
    const res = await request
      .get('/event')
      .query({
        'page[size]': 5,
        'page[number]': 1,
      })
      .set('Authorization', 'Bearer permitToken');

    expect(res.status).toEqual(200);
    expect(res.text).not.toBeNull();
    const j = JSON.parse(res.text);
    expect(j).not.toBeNull();
    expect(j.data).toHaveLength(1);
    expect(j.data[0]).toHaveProperty('entity');

    expect(j.data[0].entity.id).toEqual('aoveu03dv921dvo2');
  });
});
