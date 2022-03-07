const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');

describe('Get Default Component versions configs', () => {
  let server;

  beforeEach(async () => {
    const eventBus = new EventBusMock();
    const config = {
      get(key) {
        return this[key];
      },
      MONGODB_URI: process.env.MONGODB_URI
        ? process.env.MONGODB_URI
        : 'mongodb://localhost/test',
    };

    server = new Server({ config, logger, iam, eventBus });
    await server.start();
    await insertDatainDb();
  });

  afterEach(async () => {
    await deleteAllData();
    await server.stop();
  });

  it('should return two components version configurations to the permitToken user', async () => {
    const { body, statusCode } = await request(server.getApp())
      .get('/virtual-components/defaults/config')
      .set('Authorization', 'permitToken');

    expect(body.data).lengthOf(2);
    expect(statusCode).to.equal(200);
  });
  it('should return three components version configurations to the admin', async () => {
    const { body, statusCode } = await request(server.getApp())
      .get('/virtual-components/defaults/config')
      .set('Authorization', 'adminToken');

    expect(body.data).lengthOf(3);
    expect(statusCode).to.equal(200);
  });
});
