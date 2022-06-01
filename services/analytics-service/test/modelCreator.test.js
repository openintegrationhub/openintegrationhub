/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const config = require('../app/config/index');
// const hostUrl = 'http://localhost';
// const port = process.env.PORT || 3009;
// const request = require('supertest')(`${hostUrl}:${port}`);
// const iamMock = require('./utils/iamMock');
// const token = require('./utils/tokens');

const Server = require('../app/server');

const mainServer = new Server();

const modelCreator = require('../app/models/modelCreator'); // eslint-disable-line

const log = require('../app/config/logger');

let functionId;
let app;

beforeAll(async () => {
  // iamMock.setup();
  // mainServer.setupMiddleware();
  await mainServer.setupRoutes();
  await mainServer.setupSwagger();
  await mainServer.setup(mongoose);
  app = await mainServer.listen();

  modelCreator.createModels();
});

describe('modelCreator Operations', () => {
  test.only('should create all configured models', async () => {
    for (const key in config.timeWindows) { // eslint-disable-line guard-for-in
      log.debug('key', key);
      let expires;
      if (key in config.storageWindows) {
        expires = `${config.storageWindows[key]}s`;
      } else {
        log.error('You need to set the storage window or it will default to 24h');
        expires = '24h';
      }

      // log.debug('paths:', modelCreator[key].paths);

      let collectionKey = `components_${key}`;
      expect(collectionKey in modelCreator).toEqual(true);

      // expect(modelCreator[collectionKey].paths['status.enum'].schemaOptions.collection).toEqual(collectionKey);
      // expect(modelCreator[collectionKey].paths.createdAt.options.expires).toEqual(expires);
      expect(typeof modelCreator[collectionKey]).toEqual('function');

      collectionKey = `flows_${key}`;
      expect(collectionKey in modelCreator).toEqual(true);
      // expect(modelCreator[collectionKey].paths['status.enum'].schemaOptions.collection).toEqual(collectionKey);
      // expect(modelCreator[collectionKey].paths.createdAt.options.expires).toEqual(expires);
      expect(typeof modelCreator[collectionKey]).toEqual('function');

      collectionKey = `flowTemplates_${key}`;
      expect(collectionKey in modelCreator).toEqual(true);
      
      // expect('usage' in modelCreator[collectionKey].paths).toEqual(true);
      // expect(modelCreator[collectionKey].paths.createdAt.options.expires).toEqual(expires);
      expect(typeof modelCreator[collectionKey]).toEqual('function');
    }
  });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
