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
const { getAndUpdateFlowStats } = require('../app/utils/gatherStats');

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

describe('/flowStats', () => {
  test('should update flowStats when polled', async () => {
    nock('http://localhost:3001')
      .get('/flows')
      .query({
        'filter[status]': 'active',
        'page[size]': 100,
        'page[number]': 0,
      })
      .reply(200, { data: [{ active: true }, { active: true }], meta: { count: 3 } });

    nock('http://localhost:3001')
      .get('/flows')
      .query({ 'filter[status]': 'inactive', 'page[size]': 100, 'page[number]': 0 })
      .reply(200, { data: [{ active: false }], meta: { count: 0 } });

    await getAndUpdateFlowStats('Bearer Test');

    const flowStats = await modelCreator.models.flowStats_15min.find().lean();

    expect(flowStats.length).toEqual(1);
    const bucket = flowStats[0];

    expect(bucket.active).toEqual(2);
    expect(bucket.inactive).toEqual(1);
  });

  test('should get all flowStats in a specified time window', async () => {
    const until = dayjs().subtract(1, 'day');
    const from = until.subtract(45, 'minute');

    const early = {
      active: 10,
      inactive: 5,
      bucketStartAt: from.subtract(15, 'minute').valueOf(),
    };

    const current1 = {
      active: 12,
      inactive: 7,
      bucketStartAt: from.valueOf(),
    };

    const current2 = {
      active: 15,
      inactive: 9,
      bucketStartAt: until.subtract(15, 'minute').valueOf(),
    };

    const late = {
      active: 20,
      inactive: 10,
      bucketStartAt: until.add(15, 'minute').valueOf(),
    };

    await new modelCreator.models.flowStats_15min(early).save();
    await new modelCreator.models.flowStats_15min(current1).save();
    await new modelCreator.models.flowStats_15min(current2).save();
    await new modelCreator.models.flowStats_15min(late).save();

    const res = await request
      .get('/flowStats')
      .query({
        interval: '15min',
        from: from.valueOf(),
        until: until.valueOf(),
      })
      .set('Authorization', 'Bearer adminToken');

    expect(res.status).toEqual(200);
    expect(res.body.data.length).toEqual(2);
    expect(res.body.data[0].active).toEqual(12);
    expect(res.body.data[0].inactive).toEqual(7);
    expect(res.body.data[1].active).toEqual(15);
    expect(res.body.data[1].inactive).toEqual(9);
    expect(res.body.meta.count).toEqual(5);
  });
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  if (app) app.close();
});
