/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3003;
const request = require('supertest')(`${hostUrl}:${port}`);
const Chunk = require('../app/models/chunk');

const Server = require('../app/server');

const mainServer = new Server();
let app;

const {
  chunk1, chunk2, chunk3, chunk4, chunk5, chunk6,
  chunk7, chunk8, chunk9, chunk10, chunk11, chunk12,
  chunk13, chunk14, chunk15,
} = require('./seed/chunk.seed');
const log = require('../app/config/logger');

beforeAll(async () => {
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();
});

afterAll(async () => {
  const ilaIds = ['123asd', '987asd', '567qwe'];
  await Chunk.deleteMany({ ilaId: { $in: ilaIds } });
  await mongoose.connection.close();
  await app.close();
});

describe('Documentation', () => {
  test('should display the swagger-generated HTML page', async () => {
    const res = await request.get('/api-docs/');
    expect(res.text).not.toHaveLength(0);
    expect(res.text).toMatch(/HTML for static distribution bundle build/);
  });
});

describe('POST chunks', () => {
  test('should create an invalid chunk and return 200', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk1);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toEqual({});
    expect(res.body.data).toMatchObject({
      expireAt: expect.any(String),
      ilaId: expect.any(String),
      cid: expect.any(String),
      payload: expect.any(Object),
    });
    // expect(res.body.data.def.domainId).toEqual('5d3031a20cbe7c00115c7d8f');
    // expect(res.body.data.def.schemaUri).toEqual('address');
    expect(res.body.data.payload.lastName).toEqual('Doe');
    expect(res.body.data.payload.email).toEqual('doe@mail.com');
    expect(res.body.data.valid).toBeFalsy();
  });

  test('should create a valid chunk from Metadata Repository schema and return 200', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk6);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toEqual({});
    expect(res.body.data).toMatchObject({
      expireAt: expect.any(String),
      ilaId: expect.any(String),
      cid: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.body.data.payload.lastName).toEqual('Hobbs');
    expect(res.body.data.payload.firstName).toEqual('Jack');
    expect(res.body.data.payload.email).toEqual('hobbs@mail.com');
    expect(res.body.data.valid).toBeTruthy();
  });

  test('should return 400 if schema is invalid', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk15);
    expect(res.status).toEqual(400);
    expect(res.body.errors[0].message).toEqual('Schema is invalid!');
  });

  test('should return 400 if ilaId contains special characters', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk14);
    expect(res.status).toEqual(400);
    expect(res.body.errors[0].message).toEqual('ilaId must not contain special characters!');
  });

  test('should validate a valid SDF object', async () => {
    const res = await request
      .post('/chunks/validate')
      .send(chunk6);
    expect(res.status).toEqual(200);
    expect(res.body.data.valid).toBeTruthy();
  });

  test('should validate an invalid SDF object', async () => {
    const res = await request
      .post('/chunks/validate')
      .send(chunk13);
    expect(res.status).toEqual(200);
    expect(res.body.data.valid).toBeFalsy();
  });

  test('should merge two valid chunks and return 200', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk1)
      .send(chunk2);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toEqual({});
    expect(res.body.data).toMatchObject({
      expireAt: expect.any(String),
      ilaId: expect.any(String),
      cid: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.body.data.payload.firstName).toEqual('John');
    expect(res.body.data.payload.lastName).toEqual('Doe');
    expect(res.body.data.payload.email).toEqual('doe@mail.com');
    expect(res.body.data.payload.salutation).toEqual('Mr.');
  });

  test('should fetch the schema from OIH Meta Data Repository', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk6);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toEqual({});
    expect(res.body.data).toMatchObject({
      expireAt: expect.any(String),
      ilaId: expect.any(String),
      cid: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.body.data.payload.lastName).toEqual('Hobbs');
    expect(res.body.data.payload.firstName).toEqual('Jack');
    expect(res.body.data.payload.email).toEqual('hobbs@mail.com');
    expect(res.body.data.valid).toBeTruthy();
  });

  test('should create an invalid chunk and return 200', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk7);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toEqual({});
    expect(res.body.data).toMatchObject({
      expireAt: expect.any(String),
      ilaId: expect.any(String),
      cid: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.body.data.payload.lastName).toEqual('Peterson');
    expect(res.body.data.payload.email).toEqual('peterson@mail.com');
    expect(res.body.data.valid).toBeFalsy();
  });

  test('should update a chunk but it should be still invalid and return 200', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk8);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toEqual({});
    expect(res.body.data).toMatchObject({
      expireAt: expect.any(String),
      ilaId: expect.any(String),
      cid: expect.any(String),
      payload: expect.any(Object),
    });
    expect(res.body.data.valid).toBeFalsy();
    expect(res.body.data.payload.lastName).toEqual('Peterson');
    expect(res.body.data.payload.email).toEqual('peterson@mail.com');
  });

  test('should return 400 if cid\'s doesn\'t match', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk9);
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toEqual('CID and def must match with other flow!');
  });

  test('should return 400 if cid is missing in payload', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk4);
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toEqual('Payload does not contain cid!');
  });

  test('should return 400 if ilaId is undefined', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk5);
    expect(res.status).toEqual(400);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toEqual('Input does not match schema!');
  });

  test('should return 404 if neither schema nor uri are provided', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk10);
    expect(res.status).toEqual(404);
    expect(res.body.errors[0].message).toEqual('Domain ID and Schema URI or custom schema must be specified!');
  });

  test('should return 404 if domainId is provided but schemaUri is missing', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk11);
    expect(res.status).toEqual(404);
    expect(res.body.errors[0].message).toEqual('Domain ID and Schema URI or custom schema must be specified!');
  });

  test('should return 404 if domainId, schemaUri and schema are provided', async () => {
    const res = await request
      .post('/chunks')
      .send(chunk12);
    expect(res.status).toEqual(405);
    expect(res.body.errors[0].message).toEqual('Either domainId with schemaUri or custom schema must be specified, but not both!');
  });
});

describe('GET chunks', () => {
  test('should return a chunk and 200', async () => {
    const res = await request
      .get(`/chunks/${chunk1.ilaId}`);
    expect(res.status).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta.total).toEqual(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].ilaId).toEqual('123asd');
    expect(res.body.data[0].cid).toEqual('email');
    expect(res.body.data[0].valid).toBeTruthy();
    expect(res.body.data[0].payload.firstName).toEqual('John');
    expect(res.body.data[0].payload.lastName).toEqual('Doe');
    expect(res.body.data[0].payload.email).toEqual('doe@mail.com');
    expect(res.body.data[0].payload.salutation).toEqual('Mr.');
  });

  test('should return 404 if no chunks found', async () => {
    const res = await request
      .get('/chunks/1234567}');
    expect(res.status).toEqual(404);
    expect(res.body.errors[0].message).toEqual('No chunks found!');
  });

  test('should return 400 if ilaId is undefined', async () => {
    let ilaId;
    const res = await request
      .get(`/chunks/${ilaId}`);
    expect(res.status).toEqual(400);
    expect(res.body.errors[0].message).toEqual('Integration Layer Adapter ID required!');
  });
});
