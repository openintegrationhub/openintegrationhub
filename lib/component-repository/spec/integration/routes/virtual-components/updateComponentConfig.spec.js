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
const {
  virtualComponent2,
  componentVersion2,
  virtualComponentNoConfig,
  componentVersionNoConfig,
} = require('./__mocks__/virtualComponentsData');

describe('Update Component Config', () => {
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
          'mongodb+srv://IoannisLafiotis:vNyTCysaTMki03TB@cluster0.hpq7s.mongodb.net/comps?retryWrites=true&w=majority',
    };

    server = new Server({ config, logger, iam, eventBus });
    await server.start();
    await insertDatainDb();
  });

  afterEach(async () => {
    await deleteAllData();
    await server.stop();
  });

  it('should return 400 error, invalid authClientId is required', async () => {
    const message = 'Invalid auth Client id';
    const { body, statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponent2._id}/${componentVersion2._id}/config`
      )
      .send({
        authClientId: 'z8bda8bsad67as8dz',
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(400);
    expect(body.errors).length(1);
    expect(body.errors[0].message).to.equal(message);
  });
  it('should return 400 error, invalid component version Id', async () => {
    const message = 'Invalid id';
    const { body, statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponentNoConfig._id}/7da8sgdsad8agsadu/config`
      )
      .send({
        authClientId: new ObjectId(),
      })
      .set('Authorization', 'permitToken');

    expect(body.errors).length(1);
    expect(body.errors[0].message).to.equal(message);
    expect(statusCode).to.equal(400);
  });
  it('should return 200 , succesfully updated config', async () => {
    const newAuthClientId = new ObjectId();
    const { body, statusCode } = await request(server.getApp())
      .patch(
        `/virtual-components/${virtualComponentNoConfig._id}/${componentVersion2._id}/config`
      )
      .send({
        authClientId: newAuthClientId,
      })
      .set('Authorization', 'permitToken');

    expect(body.data.authClientId).to.equal(`${newAuthClientId}`);
    expect(statusCode).to.equal(200);
  });
});
