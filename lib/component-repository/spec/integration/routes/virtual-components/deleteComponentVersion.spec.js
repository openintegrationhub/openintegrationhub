const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const {
  virtualComponent2,
  virtualComponent1,
  componentVersion2,
  componentVersionNotDefaultVersion,
} = require('./__mocks__/virtualComponentsData');

describe('Delete Component Version', () => {
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

  it('should return 400, when trying to delete the default component version', async () => {
    const { body, statusCode } = await request(server.getApp())
      .delete(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}`
      )
      .set('Authorization', 'permitToken');
    const message = 'Cannot delete the default component Version';
    expect(body.errors[0].message).to.equal(message);
    expect(statusCode).to.equal(400);
  });

  it('should return 204, when trying to delete a non default component version', async () => {
    const object = await request(server.getApp())
      .get(`/virtual-components/${virtualComponent1._id}`)
      .set('Authorization', 'adminToken');
    const versionLength = object.body.data.versions.length;
    const { statusCode } = await request(server.getApp())
      .delete(
        `/virtual-components/${virtualComponent1._id}/${componentVersionNotDefaultVersion._id}`
      )
      .set('Authorization', 'adminToken');
    const object2 = await request(server.getApp())
      .get(`/virtual-components/${virtualComponent1._id}`)
      .set('Authorization', 'adminToken');
    const versionLength2 = object2.body.data.versions.length;

    expect(versionLength2).to.equal(versionLength - 1);
    expect(statusCode).to.equal(204);
  });

  it('should return 400 error, invalid component version Id', async () => {
    const { body, statusCode } = await request(server.getApp())
      .delete(`/virtual-components/${virtualComponent2._id}/bbd9oasbd8asdodasj`)
      .set('Authorization', 'permitToken');
    const message = 'Invalid component version id';
    expect(body.errors).length(1);
    expect(body.errors[0].message).to.equal(message);
    expect(statusCode).to.equal(400);
  });
});
