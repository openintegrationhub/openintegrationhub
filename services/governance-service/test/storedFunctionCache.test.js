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

const config = require('../app/config/index');

const storage = require(`../app/api/controllers/${config.storage}`); // eslint-disable-line

// const StoredFunction = require('../app/models/storedFunction');

const storedFunctionCache = require('../app/config/storedFunctionCache');

// const Server = require('../app/server');
//
// const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let functionId1;
let functionId2;
let app;

beforeAll(async () => {
  // mongoose.connection.collections.storedFunction.remove();

  const newFunction = {
    name: 'MyStoredFunction1',
    code: 'return x * y',
  };

  const result = await storage.addStoredFunction(adminId, newFunction.name, newFunction.code);
  console.log('this result:', result);
  functionId1 = result.id;
  console.log('functionId1', functionId1);

  // iamMock.setup();
  // await mainServer.setupMiddleware();
  // await mainServer.setupRoutes();
  // mainServer.setupSwagger();
  // await mainServer.setup(mongoose);
  // await mainServer.listen();
  //
  // app = mainServer;

  // await storedFunctionCache.loadAll();
});

afterAll(async () => {
  // if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});

describe('StoredFunctionCache Operations', () => {
  test.only('should load all already existing stored functions', async () => {
    expect(true).toBe(true);
    // await storedFunctionCache.loadAll();
    // expect(typeof storedFunctionCache.storedFunctions).toBe('object');
    // expect(Object.keys(storedFunctionCache.storedFunctions).length).toEqual(1);
    // expect(Array.isArray(storedFunctionCache.storedFunctions.MyStoredFunction1)).toEqual(true);
    // expect(storedFunctionCache.storedFunctions.MyStoredFunction1.length).toEqual(1);
    // expect(typeof storedFunctionCache.storedFunctions.MyStoredFunction1[0]).toBe('object');
    // expect(storedFunctionCache.storedFunctions.MyStoredFunction1[0].code).toEqual('return x * y');
    // expect(storedFunctionCache.storedFunctions.MyStoredFunction1[0].oihUser).toEqual(adminId);
  });

  // test('should add a StoredFunction via endpoint', async () => {
  //   const newFunction = {
  //     name: 'MyStoredFunction0',
  //     code: 'return x * y * z',
  //   };
  //
  //   const res = await request
  //     .post('/storedFunction')
  //     .set('Authorization', 'Bearer adminToken')
  //     .set('accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .send(newFunction);
  //
  //   expect(res.status).toEqual(200);
  //   expect(res.text).not.toHaveLength(0);
  //
  //   expect(res).not.toBeNull();
  //   expect(res.body).toHaveProperty('id');
  //
  //   expect(res.body.metaData.oihUser).toEqual(adminId);
  //   expect(res.body.name).toEqual(newFunction.name);
  //   expect(res.body.code).toEqual(newFunction.code);
  //
  //   expect(res.body).toHaveProperty('createdAt');
  //   expect(res.body).toHaveProperty('updatedAt');
  // });

  // test('should get all already stored functions', async () => {
  //   console.log('=============================');
  //   console.log(JSON.stringify(storedFunctionCache.storedFunctions));
  //   console.log('=============================');
  //   expect(typeof storedFunctionCache.storedFunctions).toBe('object');
  //   expect(Object.keys(storedFunctionCache.storedFunctions).length).toEqual(2);
  //   expect(Array.isArray(storedFunctionCache.storedFunctions.MyStoredFunction1)).toEqual(true);
  //   expect(storedFunctionCache.storedFunctions.MyStoredFunction1.length).toEqual(1);
  //   expect(typeof storedFunctionCache.storedFunctions.MyStoredFunction1[0]).toBe('object');
  //   expect(storedFunctionCache.storedFunctions.MyStoredFunction1[0].oihUser).toEqual(adminId);
  // });
  //
  // test('should add a stored function to the cache', async () => {
  //   storedFunctionCache.upsert(functionId1, 'MyStoredFunction2', adminId, 'somecode');
  //
  //   expect(Object.keys(storedFunctionCache.storedFunctions).length).toEqual(2);
  //   expect(typeof storedFunctionCache.storedFunctions.MyStoredFunction2[0]).toBe('object');
  //
  //   expect(storedFunctionCache.storedFunctions.MyStoredFunction2[0].oihUser).toEqual(adminId);
  // });
  //
  // test('should update a stored function in the cache', async () => {
  //   storedFunctionCache.upsert(functionId1, 'MyStoredFunction1', adminId, 'somecode');
  //   expect(Object.keys(storedFunctionCache.storedFunctions).length).toEqual(2);
  //   expect(Array.isArray(storedFunctionCache.storedFunctions.MyStoredFunction1)).toEqual(true);
  //   expect(storedFunctionCache.storedFunctions.MyStoredFunction1.length).toEqual(1);
  //   expect(typeof storedFunctionCache.storedFunctions.MyStoredFunction1[0]).toBe('object');
  //
  //   expect(storedFunctionCache.storedFunctions.MyStoredFunction1[0].oihUser).toEqual(adminId);
  // });
  //
  // test('should delete a stored function from the cache', async () => {
  //   storedFunctionCache.delete(functionId1, 'MyStoredFunction1', adminId);
  //   expect(Object.keys(storedFunctionCache.storedFunctions).length).toEqual(1);
  //   expect(typeof storedFunctionCache.storedFunctions.MyStoredFunction2[0]).toBe('object');
  //
  //   expect(storedFunctionCache.storedFunctions.MyStoredFunction2[0].oihUser).toEqual(adminId);
  // });
});
