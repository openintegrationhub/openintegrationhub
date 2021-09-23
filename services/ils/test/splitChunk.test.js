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
  chunk1, chunk2, chunk3, chunk4,
} = require('./seed/splitChunk.seed');
const log = require('../app/config/logger');

beforeAll(async () => {
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();
});

afterAll(async () => {
  const ilaIds = ['123asd'];
  await Chunk.deleteMany({ ilaId: { $in: ilaIds } });
  await mongoose.connection.close();
  await app.close();
});

describe('SPLIT chunks', () => {
  test('should return 200 and split a chunk in two objects', async () => {
    const res = await request
      .post('/chunks/split')
      .send(chunk1);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(2);
    expect(res.body[0]).toHaveProperty('data');
    expect(res.body[0]).toHaveProperty('meta');
    expect(res.body[0].meta).toEqual({});
    expect(res.body[0].data).toMatchObject({
      ilaId: expect.any(String),
      payload: expect.any(Object),
      expireAt: expect.any(String),
      splitKey: expect.any(String),
      valid: expect.any(Boolean),
    });
    expect(res.body[0].data.ilaId).toEqual('123asd');
    expect(res.body[0].data.splitKey).toEqual('001');
    expect(res.body[0].data.valid).toBeFalsy();
    expect(res.body[0].data.payload.firstName).toEqual('John');
    expect(res.body[0].data.payload.lastName).toEqual('Doe');
    expect(res.body[0].data.payload.email).toEqual('doe@mail.com');

    expect(res.body[1]).toHaveProperty('data');
    expect(res.body[1]).toHaveProperty('meta');
    expect(res.body[1].meta).toEqual({});
    expect(res.body[1].data).toMatchObject({
      ilaId: expect.any(String),
      payload: expect.any(Object),
      expireAt: expect.any(String),
      splitKey: expect.any(String),
      valid: expect.any(Boolean),
    });
    expect(res.body[1].data.ilaId).toEqual('123asd');
    expect(res.body[1].data.splitKey).toEqual('002');
    expect(res.body[1].data.valid).toBeFalsy();
    expect(res.body[1].data.payload.name).toEqual('Company Ltd.');
    expect(res.body[1].data.payload.logo).toEqual('https://company.com/logo.png');
  });

  test('should return 400 if no split schema is provided', async () => {
    const res = await request
      .post('/chunks/split')
      .send(chunk2);
    expect(res.status).toEqual(400);
    expect(res.text).toEqual('Split schema is not defined!');
  });

  test('should return 400 if split schema is not valid', async () => {
    const res = await request
      .post('/chunks/split')
      .send(chunk3);
    expect(res.status).toEqual(400);
    expect(res.text).toEqual('Split schema is not valid!');
  });

  test('should return 200 and splitted objects with empty fields', async () => {
    const res = await request
      .post('/chunks/split')
      .send(chunk4);
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(2);
    expect(res.body[0].data.payload.age).toEqual('');
    expect(res.body[0].data.payload.email).toEqual('smith@mail.com');
    expect(res.body[1].data.payload.website).toEqual('');
    expect(res.body[1].data.payload.name).toEqual('Company Ltd.');
  });
});

describe('GET splitted chunks', () => {
  test('should return 200 and splitted chunks', async () => {
    const { splitKey } = chunk4.splitSchema[0].meta;
    const res = await request
      .get(`/chunks/${chunk4.ilaId}?key=${splitKey}`);
    expect(res.status).toEqual(200);
    expect(res.body.data.length).toEqual(2);
    expect(res.body.data[0].splitKey).toEqual('001');
    expect(res.body.data[1].splitKey).toEqual('001');
    expect(res.body.data[0].payload.firstName).toEqual('John');
    expect(res.body.data[1].payload.lastName).toEqual('Smith');
  });

  test('should return 404 if no chunks with this key were found', async () => {
    const res = await request
      .get(`/chunks/${chunk4.ilaId}?key=123456`);
    expect(res.status).toEqual(404);
    expect(res.body.errors[0].message).toEqual('No chunks found!');
  });
});
