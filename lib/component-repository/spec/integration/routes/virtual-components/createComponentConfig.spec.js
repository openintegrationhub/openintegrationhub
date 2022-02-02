const Server = require('../../../../src/Server');
const request = require('supertest');
const mongoose = require('mongoose');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const { ObjectId } = mongoose.Types;
const {
  virtualComponent2,
  componentVersion2,
  virtualComponentNoConfig,
} = require('./__mocks__/virtualComponentsData');

describe('Create Component Config', () => {
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

  it('should return 400 error, component Version is required', async () => {
    const message = 'This component version has already been set.';
    const { body, statusCode } = await request(server.getApp())
      .post(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}/config`
      )
      .send({
        authClientId: new ObjectId(),
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(400);
    expect(body.errors).length(1);
    expect(body.errors[0].message).to.equal(message);
  });
  it('should return 400 error, invalid component version Id', async () => {
    const message = 'Invalid id';
    const { body, statusCode } = await request(server.getApp())
      .post(
        `/virtual-components/${virtualComponentNoConfig._id}/7da8sgdsad8agsadu/config`
      )
      .send({
        authClientId: new ObjectId(),
      })
      .set('Authorization', 'permitToken');
    //   console.log("first body", body)
    expect(body.errors).length(1);
    expect(body.errors[0].message).to.equal(message);
    expect(statusCode).to.equal(400);
  });
});
