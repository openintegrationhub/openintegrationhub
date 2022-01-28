const Server = require('../../../../src/Server');
const request = require('supertest');
const mongoose = require('mongoose');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const { permitToken } = require('./__mocks__/tokens');
const { ObjectId } = mongoose.Types;


describe('Create Virtual Component', () => {
  let server;

  beforeEach(async () => {
    const eventBus = new EventBusMock();
    const config = {
      get(key) {
        return this[key];
      },
      MONGODB_URI: process.env.MONGODB_URI
        ? process.env.MONGODB_URI
        : // : 'mongodb://localhost/test',
          'mongodb://admin:admin@localhost:27017/test?authSource=admin',
    };

    server = new Server({ config, logger, iam, eventBus });
    await server.start();
    await insertDatainDb();
  });

  afterEach(async () => {
    await deleteAllData();
    await server.stop();
  });

  it('should return 400 error, name is required', async () => {
    const { body, statusCode } = await request(server.getApp())
      .post('/virtual-components')
      .send({
        access: 'public',
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(400);
    expect(body.errors).length(1);
    const { message } = body.errors[0];
    expect(message).contain('name');
  });

  it('should create a new virtual component', async () => {
    const newName = 'test';
    const newAccess = 'public';
    const { body, statusCode } = await request(server.getApp())
      .post('/virtual-components')
      .send({
        name: newName,
        access: newAccess,
        owners: [{ id: new ObjectId(), type: 'sub' }],
        tenant: new ObjectId(),
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(201);
    const { tenant, owners, access, name } = body.data;
    expect(name).to.equal(newName);
    expect(tenant).to.equal(permitToken.value.tenant);
    expect(access).to.equal(newAccess);
    expect(owners[0].id).to.equal(permitToken.value.sub);
  });

  it('should return 403 unauthorized', async () => {
    const newName = 'test';
    const newAccess = 'public';
    const { statusCode } = await request(server.getApp())
      .post('/virtual-components')
      .send({
        name: newName,
        access: newAccess,
      })
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });

  it('should create a new virtual component with tenant and owners from body', async () => {
    const newName = 'testing';
    const newAccess = 'public';
    const ownerId = new ObjectId();
    const tenantId = new ObjectId();
    const { body, statusCode } = await request(server.getApp())
      .post('/virtual-components')
      .send({
        name: newName,
        access: newAccess,
        owners: [{ id: ownerId, type: 'sub' }],
        tenant: tenantId,
      })
      .set('Authorization', 'adminToken');
    expect(statusCode).to.equal(201);
    const { tenant, owners, access, name } = body.data;
    expect(name).to.equal(newName);
    expect(tenantId.equals(tenant)).to.true;
    expect(access).to.equal(newAccess);
    expect(ownerId.equals(owners[0].id)).to.true;
  });
});
