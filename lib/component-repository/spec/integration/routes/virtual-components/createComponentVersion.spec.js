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
  component2,
} = require('./__mocks__/virtualComponentsData');

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

  it('should return 404 error, virtualComponent not found', async () => {
    const { statusCode } = await request(server.getApp())
      .post(`/virtual-components/${new ObjectId()}`)
      .send({
        description: '',
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(404);
  });

  it('should return 403 error, user without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .post(`/virtual-components/${virtualComponent2._id}`)
      .send({
        description: '',
      })
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });

  it('should return 403 error, component that does not belong to the user', async () => {
    const { statusCode } = await request(server.getApp())
      .post(`/virtual-components/${virtualComponent2._id}`)
      .send({
        description: '',
      })
      .set('Authorization', 'otherTenantToken');

    expect(statusCode).to.equal(404);
  });

  it('should return 400 error, some fields are required', async () => {
    const { body, statusCode } = await request(server.getApp())
      .post(`/virtual-components/${virtualComponent2._id}`)
      .send({
        description: '',
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

  it('should create a new component version', async () => {
    const newname = 'new version';
    const authorizationType = 'API_KEY';
    const {
      body: {
        data: { name, authorization, componentId, virtualComponentId },
      },
      statusCode,
    } = await request(server.getApp())
      .post(`/virtual-components/${virtualComponent2._id}`)
      .send({
        name: newname,
        authorization: {
          authType: authorizationType,
        },
        componentId: component2._id,
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(201);
    expect(name).to.equal(newname);
    expect(authorization.authType).to.equal(authorizationType);
    expect(component2._id.equals(componentId)).to.true;
    expect(virtualComponent2._id.equals(virtualComponentId)).to.true;
  });

  it('should create a new component version with triggers and actions already formatted', async () => {
    const newname = 'new version';
    const authorizationType = 'API_KEY';
    const functionExample = {
      active: false,
      name: 'alarm',
      title: 'test',
      function: 'https://millie.com',
    };
    const {
      body: {
        data: { triggers, actions },
      },
      statusCode,
    } = await request(server.getApp())
      .post(`/virtual-components/${virtualComponent2._id}`)
      .send({
        name: newname,
        authorization: {
          authType: authorizationType,
        },
        componentId: component2._id,
        triggers: [functionExample, functionExample],
        actions: [functionExample, functionExample],
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(201);
    expect(triggers).to.length(2);
    expect(actions).to.length(2);
  });

  it('should create a new component version with triggers and actions with component format', async () => {
    const newname = 'new version';
    const authorizationType = 'API_KEY';
    const firstFunctionNotFormatted = {
      getNextCustomerNumber: {
        main: './lib/actions/getNextCustomerNumber.js',
        title: 'Get next free customer number',
        description:
          'Retrieves the next available customer number. Avoids duplicates.',
        fields: {
          verbose: {
            viewClass: 'CheckBoxView',
            label: 'Debug this step (log more data)',
          },
        },
        metadata: {
          in: './lib/schemas/getNextCustomerNumber.in.json',
          out: './lib/schemas/getNextCustomerNumber.out.json',
        },
      },
    };
    const secondFunctionNotFormatted = {
      newFunction: {
        main: './lib/actions/newFunction.js',
        title: 'Get next free customer number',
        description:
          'Retrieves the next available customer number. Avoids duplicates.',
        fields: {
          verbose: {
            viewClass: 'CheckBoxView',
            label: 'Debug this step (log more data)',
          },
        },
        metadata: {
          in: './lib/schemas/newFunction.in.json',
          out: './lib/schemas/newFunction.out.json',
        },
      },
    };
    const {
      body: {
        data: { triggers, actions },
      },
      statusCode,
    } = await request(server.getApp())
      .post(`/virtual-components/${virtualComponent2._id}`)
      .send({
        name: newname,
        authorization: {
          authType: authorizationType,
        },
        componentId: component2._id,
        triggers: {
          ...firstFunctionNotFormatted,
          ...secondFunctionNotFormatted,
        },
        actions: {
          ...firstFunctionNotFormatted,
          ...secondFunctionNotFormatted,
        },
      })
      .set('Authorization', 'permitToken');

    expect(statusCode).to.equal(201);
    expect(triggers).to.length(2);
    expect(actions).to.length(2);
  });

  it('should return not authorize to a user without permissions', async () => {
    const { statusCode } = await request(server.getApp())
      .post(`/virtual-components/${virtualComponent2._id}`)
      .send({
        name: 'not get this point',
      })
      .set('Authorization', 'unpermitToken');

    expect(statusCode).to.equal(403);
  });
});
