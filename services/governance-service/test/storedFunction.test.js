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
const { addStoredFunction } = require('../app/api/controllers/mongo');
const { reportHealth } = require('../app/utils/eventBus');

const StoredFunction = require('../app/models/storedFunction');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let functionId;
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


describe('Login Security', () => {
  test('should not be able to get StoredFunctions without login', async () => {
    const res = await request.get('/storedFunction');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to add StoredFunctions without login', async () => {
    const res = await request.post('/storedFunction');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });

  test('should not be able to delete specific StoredFunctions without login', async () => {
    const res = await request.delete('/storedFunction/123456789012');
    expect(res.status).toEqual(401);
    expect(res.text).not.toHaveLength(0);
    expect(res.body.errors[0].message).toEqual('Missing authorization header.');
  });
});


describe('StoredFunction Operations', () => {
  test('should add a StoredFunction', async () => {
    const newFunction = {
      name: 'MyFunction1',
      code: 'return x * y',
    };

    const res = await request
      .post('/storedFunction')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(newFunction);

    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    console.log(res);

    expect(res).not.toBeNull();
    expect(res.body).toHaveProperty('id');

    expect(res.body.metaData.user).toEqual('x');
    expect(res.body.name).toEqual(newFunction.name);
    expect(res.body.code).toEqual(newFunction.code);
  });


  test('should show the stored function in list', async () => {
    const res = await request
      .get('/storedFunction')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body.data).have.lengthOf(1);
    expect(res.body.data[0].name).toEqual('MyFunction1');
    // expect(res.body[0].code).toEqual('return x * y');
  });

  test('should add another StoredFunction', async () => {
    const newFunction = {
      name: 'MyFunction2',
      code: 'return x * y * z',
    };

    const res = await request
      .post('/storedFunction')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(newFunction);

    expect(res.status).toEqual(200);
    expect(res.text).not.toHaveLength(0);
    console.log(res);

    expect(res).not.toBeNull();
    expect(res.body).toHaveProperty('id');

    functionId = res.body.id;

    expect(res.body.metaData.user).toEqual('x');
    expect(res.body.name).toEqual(newFunction.name);
    expect(res.body.code).toEqual(newFunction.code);
  });

  test('should show the stored functions in list', async () => {
    const res = await request
      .get('/storedFunction')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body.data).have.lengthOf(2);

    expect(res.body.data[0].name).toEqual('MyFunction1');
    // expect(res.body[0].code).toEqual('return x * y');

    expect(res.body.data[1].name).toEqual('MyFunction2');
    // expect(res.body[1].code).toEqual('return x * y * z');
  });

  test('should provide the selected stored functions code in list', async () => {
    const res = await request
      .get('/storedFunction')
      .query({
        fields: 'MyFunction2',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body.data).have.lengthOf(1);

    expect(res.body.data[0].name).toEqual('MyFunction2');
    expect(res.body.data[0].code).toEqual('return x * y * z');

    expect(res.body.defaultFunctions[0].name).toEqual('DefaultFunction1');
    expect(res.body.efaultFunctions[0].code).toEqual('x * y');
  });

  test('should provide the selected stored functions code in list', async () => {
    const res = await request
      .get('/storedFunction')
      .query({
        fields: 'MyFunction2, MyFunction1',
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body.data).have.lengthOf(1);

    expect(res.body.data[0].name).toEqual('MyFunction1');
    expect(res.body.data[0].code).toEqual('return x * y');

    expect(res.body.data[1].name).toEqual('MyFunction2');
    expect(res.body.data[1].code).toEqual('return x * y * z');
  });

  test('should delete a stored function', async () => {
    const res = await request
      .delete(`/storedFunction/${functionId}`)
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);

    console.log(res.body);
  });

  test('should provide the remaining stored function in list', async () => {
    const res = await request
      .get('/storedFunction')
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body.data).have.lengthOf(1);

    expect(res.body.data[0].name).toEqual('MyFunction2');
    expect(res.body.data[0].code).toEqual('return x * y * z');
  });
});
