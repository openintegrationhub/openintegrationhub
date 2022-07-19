/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');
const nock = require('nock');
const dayjs = require('dayjs');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3009;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock');
const token = require('./utils/tokens');
const config = require('../app/config/index');

const Server = require('../app/server');

const mainServer = new Server();

const modelCreator = require('../app/models/modelCreator'); // eslint-disable-line

const log = require('../app/config/logger');
const { getAndUpdateUserStats } = require('../app/utils/gatherStats');

let functionId;
let app;

beforeAll(async () => {
  iamMock.setup();
  // mainServer.setupMiddleware();
  await mainServer.setupRoutes();
  await mainServer.setupSwagger();
  await mainServer.setup(mongoose);
  app = await mainServer.listen();

  modelCreator.createModels();
});

describe('/userStats', () => {
  test('should update userStats when polled', async () => {
    nock('http://localhost:3099')
      .get('/api/v1/users')
      .reply(200, [{ safeguard: { lastLogin: dayjs().valueOf() } }, { safeguard: { lastLogin: dayjs().subtract(8, 'day').valueOf() } }, { safeguard: { lastLogin: dayjs().subtract(70, 'day').valueOf() } }]);

    await getAndUpdateUserStats('Bearer adminToken');

    const userStats = await modelCreator.models.userStats_15min.find().lean();

    expect(userStats.length).toEqual(1);
    const bucket = userStats[0];

    expect(bucket.total).toEqual(3);
    expect(bucket.recentlyActive).toEqual(1);
    expect(bucket.inactive).toEqual(1);
  });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
