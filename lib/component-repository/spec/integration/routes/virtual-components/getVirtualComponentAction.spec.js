const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const {
  virtualComponent2,
  componentVersion2,
} = require('./__mocks__/virtualComponentsData');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const validId = new ObjectId();

describe('Get action from a component version', () => {
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

  it('should return the action to the permitToken user', async () => {
    const { statusCode } = await request(server.getApp())
      .get(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}/actions/name1`
      )
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(200);
  });
  it('should return could not find the action to the permitToken user', async () => {
    const message = 'Invalid id';
    const { body, statusCode } = await request(server.getApp())
      .get(
        `/virtual-components/${virtualComponent2._id}/76fadvsdad87sad7as7g9i/actions/name1`
      )
      .set('Authorization', 'permitToken');

    expect(body.errors[0].message).to.equal(message);
    expect(statusCode).to.equal(400);
  });
  it('should return could not find the component Version to the permitToken user', async () => {
    const message = 'Component version or action could not be found!';
    const { body, statusCode } = await request(server.getApp())
      .get(
        `/virtual-components/${virtualComponent2._id}/${validId}/actions/name1`
      )
      .set('Authorization', 'permitToken');

    expect(body.errors[0].message).to.equal(message);
    expect(statusCode).to.equal(404);
  });
  it('should return could not find the action to the permitToken user', async () => {
    const message = 'Component version or action could not be found!';
    const { body, statusCode } = await request(server.getApp())
      .get(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}/actions/nam310`
      )
      .set('Authorization', 'permitToken');

    expect(body.errors[0].message).to.equal(message);
    expect(statusCode).to.equal(404);
  });
});
