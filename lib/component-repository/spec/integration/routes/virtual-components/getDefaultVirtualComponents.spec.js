const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const {
  componentVersionNotDefaultVersion,
} = require('./__mocks__/virtualComponentsData');

describe('Get Default Component versions', () => {
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

  it('should return components version to the permitToken user', async () => {
    const { body, statusCode } = await request(server.getApp())
      .get('/virtual-components/defaults')
      .set('Authorization', 'permitToken');

    expect(body.data).lengthOf(4);
    const notDefaultId = componentVersionNotDefaultVersion._id;
    const isNotDefaultInResult = body.data.some(
      ({ _id }) => _id === notDefaultId
    );
    expect(isNotDefaultInResult).to.be.false;
    expect(statusCode).to.equal(200);
  });

  it('should return components version to the admin user', async () => {
    const { body, statusCode } = await request(server.getApp())
      .get('/virtual-components/defaults')
      .set('Authorization', 'adminToken');

    expect(body.data).lengthOf(6);
    const notDefaultId = componentVersionNotDefaultVersion._id;
    const isNotDefaultInResult = body.data.some(
      ({ _id }) => _id === notDefaultId
    );
    expect(isNotDefaultInResult).to.be.false;
    expect(statusCode).to.equal(200);
  });
});
