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


describe('applyPolicy Operations', () => {
  test('should apply a simple anonymize duty', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          duty: [
            {
              action: 'anonymize',
              constraint: {
                leftOperand: 'lastName',
                operator: 'applyToKey',
              },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('XXXXXXXXXX');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });
});
