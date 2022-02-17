const request = require('supertest');
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
const { expect } = require('chai');
const EventBusMock = require('../../EventBusMock');
const { iam } = require('./__mocks__/iamMiddleware');
const { logger } = require('./__mocks__/logger');
const Server = require('../../../../src/Server');
const { insertDatainDb, deleteAllData } = require('./__mocks__/insertData');
const { virtualComponent2 } = require('./__mocks__/virtualComponentsData');

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

  it('should update a new virtual component', async () => {
    const newName = 'test';
    const newAccess = 'private';

    // create a new virtual component to update it
    const {
      body: {
        data: { _id: newComponentId, versions: newVersions, name: savedName },
      },
    } = await request(server.getApp())
      .post('/virtual-components')
      .send({
        name: newName,
        access: newAccess,
        owners: [{ id: new ObjectId(), type: 'sub' }],
        tenant: new ObjectId(),
        versions: [
          {
            id: new ObjectId(),
            componentVersion: '001',
            apiVersion: '3.0.0'
          },
        ],
        defaultVersionId: new ObjectId(),
      })
      .set('Authorization', 'permitToken');

    expect(newVersions).to.length(1);
    expect(savedName).to.equal(savedName);

    const updatedName = faker.name.firstName();

    const {
      body: {
        data: {
          _id,
          versions: updatedVersions,
          name: updatedSavedName,
          defaultVersionId: updatedDefaultVersionId,
        },
      },
    } = await request(server.getApp())
      .patch(`/virtual-components/${newComponentId}`)
      .send({
        name: updatedName,
        access: 'private',
        owners: [{ id: new ObjectId(), type: 'sub' }],
        tenant: new ObjectId(),
        versions: [],
        defaultVersionId: null,
      })
      .set('Authorization', 'permitToken');

    expect(updatedSavedName).to.equal(updatedName);
    expect(newComponentId).to.equal(_id);
    expect(updatedVersions).to.length(0);
    expect(updatedDefaultVersionId).to.null;
  });

  it('should return 404 error, virtual component not found', async () => {
    const objectId = new ObjectId();
    const { statusCode } = await request(server.getApp())
      .patch(`/virtual-components/${objectId}`)
      .send({
        access: 'public',
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(404);
  });

  it('should return 404 error, virtual component without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .patch(`/virtual-components/${virtualComponent2._id}`)
      .send({
        versions: [],
      })
      .set('Authorization', 'otherTenantToken');

    expect(statusCode).to.equal(404);
  });

  it('should return updated private virtual component that belongs to the token user ', async () => {
    const {
      statusCode,
      body: {
        data: { versions },
      },
    } = await request(server.getApp())
      .patch(`/virtual-components/${virtualComponent2._id}`)
      .send({
        versions: [],
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(200);
    expect(versions).to.length(0);
  });

  it('should return updated private virtual component with an admin user that belongs to other user ', async () => {
    const {
      statusCode,
      body: {
        data: { versions },
      },
    } = await request(server.getApp())
      .patch(`/virtual-components/${virtualComponent2._id}`)
      .send({
        versions: [],
      })
      .set('Authorization', 'adminToken');

    expect(statusCode).to.equal(200);
    expect(versions).to.length(0);
  });

  it('should return 400 error, name is required', async () => {
    const { statusCode, body } = await request(server.getApp())
      .patch(`/virtual-components/${virtualComponent2._id}`)
      .send({
        name: '',
      })
      .set('Authorization', 'adminToken');

    expect(statusCode).to.equal(400);
    expect(body.errors).length(1);
    const { message } = body.errors[0];
    expect(message).contain('name');
  });

  it('should return not authorize to a user without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .patch(`/virtual-components/${virtualComponent2._id}`)
      .send({
        versions: [],
      })
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });
});
