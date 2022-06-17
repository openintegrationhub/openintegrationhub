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

    await getAndUpdateUserStats('Bearer Test');

    const userStats = await modelCreator.models.userStats_15min.find().lean();

    expect(userStats.length).toEqual(1);
    const bucket = userStats[0];

    expect(bucket.total).toEqual(3);
    expect(bucket.recentlyActive).toEqual(1);
    expect(bucket.inactive).toEqual(1);
  });

  // test('should get all flowStats in a specified time window', async () => {
  //   const until = Date.now();
  //   const from = Date.now() - 3 * 15 * 600000;
  //
  //   const early = {
  //     active: 10,
  //     inactive: 5,
  //     createdAt: from - 60000,
  //   };
  //
  //   const current1 = {
  //     active: 12,
  //     inactive: 7,
  //     createdAt: from + 1,
  //     intervalEnd: from + 2,
  //   };
  //
  //   const current2 = {
  //     active: 15,
  //     inactive: 9,
  //     createdAt: until - 2,
  //     intervalEnd: until - 1,
  //   };
  //
  //   const late = {
  //     active: 20,
  //     inactive: 10,
  //     intervalEnd: until + 60000,
  //   };
  //
  //   await new modelCreator.models.flowStats_15min(early).save();
  //   await new modelCreator.models.flowStats_15min(current1).save();
  //   await new modelCreator.models.flowStats_15min(current2).save();
  //   await new modelCreator.models.flowStats_15min(late).save();
  //
  //   const res = await request
  //     .get('/flowStats')
  //     .query({
  //       interval: '15min',
  //       from,
  //       until,
  //     })
  //     .set('Authorization', 'Bearer adminToken');
  //
  //   expect(res.status).toEqual(200);
  //   expect(res.body.data.length).toEqual(2);
  //   expect(res.body.data[0].active).toEqual(12);
  //   expect(res.body.data[0].inactive).toEqual(7);
  //   expect(res.body.data[1].active).toEqual(15);
  //   expect(res.body.data[1].inactive).toEqual(9);
  //   expect(res.body.meta.count).toEqual(4);
  // });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
