/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const mongoose = require('mongoose');

process.env.MONGODB_URL = global.__MONGO_URI__;

const hostUrl = 'http://localhost';
const port = process.env.PORT || 3009;
const request = require('supertest')(`${hostUrl}:${port}`);
const iamMock = require('./utils/iamMock');
const token = require('./utils/tokens');
const { addStoredFunction } = require('../app/api/controllers/mongo');
const { reportHealth } = require('../app/utils/eventBus');

const Server = require('../app/server');

const mainServer = new Server();

const log = require('../app/config/logger'); // eslint-disable-line

const adminId = token.adminToken.value.sub;
const guestId = token.guestToken.value.sub;

let functionId;
let app;

beforeAll(async () => {
  iamMock.setup();
  mainServer.setupMiddleware();
  mainServer.setupRoutes();
  mainServer.setupSwagger();
  mainServer.setup(mongoose);
  app = mainServer.listen();
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  mongoose.connection.close();
  app.close();
});

describe('applyPolicy Operations', () => {
  test('should apply a simple anonymize duty', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          duty: [
            {
              action: 'anonymize',
              constraint: {
                leftOperand: 'lastName',
                operator: 'applyToKey',
              },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('XXXXXXXXXX');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should refuse to pass if no matching permission is found', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'Customer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'publish',
            constraint: {
              leftOperand: 'categories.label',
              operator: 'equals',
              rightOperand: 'Customer',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should refuse to pass if no permission at all is present', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'Customer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should verify a simple constraint with equals', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'Customer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'categories.label',
              operator: 'equals',
              rightOperand: 'Customer',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should apply a simple constraint with equals', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'Anothercategory',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'categories.label',
              operator: 'equals',
              rightOperand: 'Customer',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should verify a simple constraint with notEquals', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'Anothercategory',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'categories.label',
              operator: 'notEquals',
              rightOperand: 'Customer',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should apply a simple constraint with notEquals', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'Customer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'categories.label',
              operator: 'notEquals',
              rightOperand: 'Customer',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should verify a simple constraint with smallerThan', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: 1234,
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'smallerThan',
              rightOperand: 12345,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual(1234);
  });

  test('should apply a simple constraint with smallerThan', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: 12345,
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'smallerThan',
              rightOperand: 12345,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual(12345);
  });

  // ////

  test('should verify a simple constraint with biggerThan', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: 12345,
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'biggerThan',
              rightOperand: 1234,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual(12345);
  });

  test('should apply a simple constraint with biggerThan', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: 12345,
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'biggerThan',
              rightOperand: 12345,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual(12345);
  });

  // ////

  test('should verify a simple constraint with smallerOrEqual', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: '12345',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'smallerOrEqual',
              rightOperand: 12345,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual('12345');
  });

  test('should apply a simple constraint with smallerOrEqual', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: '123456',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'smallerOrEqual',
              rightOperand: 12345,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual('123456');
  });

  // ////

  test('should verify a simple constraint with biggerOrEqual', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: '12345',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'biggerOrEqual',
              rightOperand: 12345,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual('12345');
  });

  test('should apply a simple constraint with biggerOrEqual', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        timestamp: '123456',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'timestamp',
              operator: 'biggerOrEqual',
              rightOperand: 1234567,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.timestamp).toEqual('123456');
  });

  // ////

  test('should verify a simple constraint with contains', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful customer service',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'comment',
              operator: 'contains',
              rightOperand: 'service',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful customer service');
  });

  test('should apply a simple constraint with contains', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful food',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'comment',
              operator: 'contains',
              rightOperand: 'service',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful food');
  });

  // ////

  test('should verify a simple constraint with notContains', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful food',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'comment',
              operator: 'notContains',
              rightOperand: 'service',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful food');
  });

  test('should apply a simple constraint with notContains', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful service',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'comment',
              operator: 'notContains',
              rightOperand: 'service',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful service');
  });

  test('should verify a constraint with logical operator or', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                {
                  or: [
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'Customer',
                    },
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'PremiumCustomer',
                    },
                  ],
                },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should verify a constraint with logical operator xone', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                {
                  xone: [
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'Customer',
                    },
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'PremiumCustomer',
                    },
                  ],
                },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should apply a constraint with logical operator xone', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Customer',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                {
                  xone: [
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'Customer',
                    },
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'PremiumCustomer',
                    },
                  ],
                },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should verify a constraint with logical operator and', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Customer',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                {
                  and: [
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'Customer',
                    },
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'PremiumCustomer',
                    },
                  ],
                },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should apply a constraint with logical operator and', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                {
                  and: [
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'Customer',
                    },
                    {
                      leftOperand: 'categories.label',
                      operator: 'equals',
                      rightOperand: 'PremiumCustomer',
                    },
                  ],
                },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should verify a constraint with logical operator and', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                {
                  and: [
                    {
                      leftOperand: 'lastName',
                      operator: 'equals',
                      rightOperand: 'Doe',
                    },
                    {
                      or: [
                        {
                          leftOperand: 'categories.label',
                          operator: 'equals',
                          rightOperand: 'Customer',
                        },
                        {
                          leftOperand: 'categories.label',
                          operator: 'equals',
                          rightOperand: 'PremiumCustomer',
                        },
                      ],
                    },
                  ],
                },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should apply a constraint with nested logical operators', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'Someothercategory',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                {
                  and: [
                    {
                      leftOperand: 'lastName',
                      operator: 'equals',
                      rightOperand: 'Doe',
                    },
                    {
                      or: [
                        {
                          leftOperand: 'categories.label',
                          operator: 'equals',
                          rightOperand: 'Customer',
                        },
                        {
                          leftOperand: 'categories.label',
                          operator: 'equals',
                          rightOperand: 'PremiumCustomer',
                        },
                      ],
                    },
                  ],
                },
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should verify a constraint with implicit and', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Customer',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                [
                  {
                    leftOperand: 'categories.label',
                    operator: 'equals',
                    rightOperand: 'Customer',
                  },
                  {
                    leftOperand: 'categories.label',
                    operator: 'equals',
                    rightOperand: 'PremiumCustomer',
                  },
                ],
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should apply a constraint with implicit and', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        birthday: '01.01.1970',
        categories: [
          {
            label: 'Somecategory',
          },
          {
            label: 'PremiumCustomer',
          },
        ],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [
            {
              action: 'distribute',
              constraint:
                [
                  {
                    leftOperand: 'categories.label',
                    operator: 'equals',
                    rightOperand: 'Customer',
                  },
                  {
                    leftOperand: 'categories.label',
                    operator: 'equals',
                    rightOperand: 'PremiumCustomer',
                  },
                ],
            },
          ],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.birthday).toEqual('01.01.1970');
  });

  test('should apply a simple constraint with exists', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful service',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'lastName',
              operator: 'exists',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful service');
  });

  test('should apply a simple constraint with exists', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful service',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'middleName',
              operator: 'exists',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful service');
  });

  test('should apply a simple constraint with notExists', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful service',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'lastName',
              operator: 'notExists',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful service');
  });

  test('should apply a simple constraint with notExists', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        comment: 'Awful service',
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'middleName',
              operator: 'notExists',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.comment).toEqual('Awful service');
  });

  test('should apply a simple constraint with hasLength', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        categories: ['customer', 'complaint'],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'categories',
              operator: 'hasLength',
              rightOperand: 2,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.categories).toEqual(['customer', 'complaint']);
  });

  test('should apply a simple constraint with hasLength', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        categories: ['customer', 'complaint'],
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'categories',
              operator: 'hasLength',
              rightOperand: 3,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.categories).toEqual(['customer', 'complaint']);
  });

  test('should apply a simple constraint with keyLength', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        address: {
          street: 'Somestreet',
          city: 'Somecity',
          country: 'Somecountry',
        },
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'address',
              operator: 'keyLength',
              rightOperand: 3,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.address).toEqual({
      street: 'Somestreet',
      city: 'Somecity',
      country: 'Somecountry',
    });
  });

  test('should apply a simple constraint with keyLength', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        address: {
          street: 'Somestreet',
          city: 'Somecity',
          country: 'Somecountry',
        },
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'address',
              operator: 'keyLength',
              rightOperand: 4,
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.address).toEqual({
      street: 'Somestreet',
      city: 'Somecity',
      country: 'Somecountry',
    });
  });

  test('should apply a simple constraint with isType', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        age: 42,
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'age',
              operator: 'isType',
              rightOperand: 'number',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(true);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.age).toEqual(42);
  });

  test('should apply a simple constraint with isType', async () => {
    const body = {
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        age: 42,
      },
      metadata: {
        applicationUid: 'google',
        recordUid: 'people/q308tz8adv088q8z',
        policy: {
          permission: [{
            action: 'distribute',
            constraint: {
              leftOperand: 'age',
              operator: 'isType',
              rightOperand: 'string',
            },
          }],
        },
      },
    };

    const res = await request
      .post('/applyPolicy')
      .query({
        action: 'distribute',
      })
      .set('Authorization', 'Bearer adminToken')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toEqual(200);
    expect(res.body.passes).toEqual(false);
    expect(res.body.data.firstName).toEqual('Jane');
    expect(res.body.data.lastName).toEqual('Doe');
    expect(res.body.data.age).toEqual(42);
  });
});
