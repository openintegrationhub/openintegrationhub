const Server = require('../../../../src/Server');
const request = require('supertest');
const mongoose = require('mongoose');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const {
  virtualComponent2,
  componentVersion2,
} = require('./__mocks__/virtualComponentsData');

const { ObjectId } = mongoose.Types;

describe('Patch Virtual Component', () => {
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
      .patch(`/virtual-components/${new ObjectId()}/${componentVersion2._id}`)
      .send({
        description: '',
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(404);
  });

  it('should return 403 error, user without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}`
      )
      .send({
        description: '',
      })
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });

  it('should return 403 error, component that does not belong to the user', async () => {
    const { statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}`
      )
      .send({
        description: '',
      })
      .set('Authorization', 'otherTenantToken');

    expect(statusCode).to.equal(404);
  });

  it('should return 400 error, some fields are required', async () => {
    const { body, statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}`
      )
      .send({
        name: '',
        authorization: { authType: '' },
        description: '',
        componentId: null,
      })
      .set('Authorization', 'permitToken');

    const errors = ['name', 'componentId', 'authorization.authType'];
    expect(statusCode).to.equal(400);
    expect(body.errors).length(errors.length);
    body.errors.forEach(({ message }) => {
      const isPropertyInErrors = errors.some((error) =>
        message.includes(error)
      );
      expect(isPropertyInErrors).to.true;
    });
  });

  it('should return not authorize to a user without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}`
      )
      .send({
        name: 'not get this point',
      })
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });

  it('should update a component version', async () => {
    const newName = 'not get this point';
    const newDescription = 'new description';
    const { body, statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}`
      )
      .send({
        name: newName,
        description: newDescription,
        actions: [
          {
            name: 'name1',
            title: 'title1',
            description: 'description1',
            function: 'getName',
          },
          {
            name: 'name2',
            title: 'title2',
            description: 'description2',
            function: 'getName2',
          },
        ],
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(200);
    expect(body.data.actions).lengthOf(2);
    expect(body.data.name).to.equal(newName);
    expect(body.data.description).to.equal(newDescription);
  });
});
