const Server = require('../../../../src/Server');
const request = require('supertest');
const mongoose = require('mongoose');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const { virtualComponent2 } = require('./__mocks__/virtualComponentsData');

const { ObjectId } = mongoose.Types;

describe('Get Virtual Components', () => {
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

  it('should return 404 not found for a not existing id', async () => {
    const notExistingId = new ObjectId();
    const message = 'VirtualComponent is not found';

    const { body, statusCode } = await request(server.getApp())
      .get(`/virtual-components/${notExistingId}`)
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(404);
    expect(body.errors[0].message).to.equal(message);
  });

  it('should return 404 not found for a not authorized virtualComponent', async () => {
    const message = 'VirtualComponent is not found';

    const { body, statusCode } = await request(server.getApp())
      .get(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'otherTenantToken');

    expect(statusCode).to.equal(404);
    expect(body.errors[0].message).to.equal(message);
  });

  it('should return the virtualComponent with the same tenant', async () => {
    const { body, statusCode } = await request(server.getApp())
      .get(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'partpermitToken');

    expect(statusCode).to.equal(200);
    const { _id, name } = body.data;
    expect(virtualComponent2._id.equals(_id)).to.true;
    expect(virtualComponent2.name).to.equals(name);
  });

  it('should return the virtualComponent with the userId in the owners', async () => {
    const { body, statusCode } = await request(server.getApp())
      .get(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(200);
    const { _id, name } = body.data;
    expect(virtualComponent2._id.equals(_id)).to.true;
    expect(virtualComponent2.name).to.equals(name);
  });

  it('should return the virtualComponent to an admin user', async () => {
    const { body, statusCode } = await request(server.getApp())
      .get(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'adminToken');
    expect(statusCode).to.equal(200);
    const { _id, name } = body.data;
    expect(virtualComponent2._id.equals(_id)).to.true;
    expect(virtualComponent2.name).to.equals(name);
  });
});
