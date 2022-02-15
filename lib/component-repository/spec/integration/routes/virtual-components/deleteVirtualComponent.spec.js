const Server = require('../../../../src/Server');
const request = require('supertest');
const mongoose = require('mongoose');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const {
  virtualComponent1,
  virtualComponent2,
  componentVersion2,
  componentConfig2,
} = require('./__mocks__/virtualComponentsData');
const ComponentConfig = require('../../../../src/models/ComponentConfig');
const ComponentVersion = require('../../../../src/models/ComponentVersion');

const { ObjectId } = mongoose.Types;

describe('Delete Virtual Component', () => {
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

  it('should return 404 error, virtualComponent not found', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${new ObjectId()}`)
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(404);
  });

  it('should return 403 error, user without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });

  it('should return 403 error, component that does not belong to the user', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'otherTenantToken');

    expect(statusCode).to.equal(403);
  });

  it('should return not authorize to a user without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });

  it('should delete the virtual component and component versions/configurations', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(204);
  });

  it('should delete a private virtual component and component versions/configurations with an admin user', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'adminToken');

    expect(statusCode).to.equal(204);
  });

  it('should delete a public virtual component and component versions/configurations with an admin user', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent1._id}`)
      .set('Authorization', 'adminToken');

    expect(statusCode).to.equal(204);
  });

  it('should delete a public virtual component and component versions/configurations with an owner user', async () => {
    const { statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent2._id}`)
      .set('Authorization', 'adminToken');

    expect(statusCode).to.equal(204);

    const componentVersionCount = await ComponentVersion.countDocuments({
      _id: componentVersion2._id,
    });
    const componentConfigCount = await ComponentConfig.countDocuments({
      _id: componentConfig2._id,
    });
    expect(componentVersionCount).eq(0);
    expect(componentConfigCount).eq(0);
  });
});
