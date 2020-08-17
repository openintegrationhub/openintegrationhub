const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const Component = require('../../../../src/models/Component');
const EventBusMock = require('../../EventBusMock');
const { can } = require('@openintegrationhub/iam-utils');

describe('GET /components', () => {
    let server;

    beforeEach(async () => {
        const eventBus = new EventBusMock();
        const config = {
            get(key) {
                return this[key];
            },
            MONGODB_URI: 'mongodb://localhost/test'
        };
        const logger = {
            info: () => {},
            debug: () => {},
            warn: () => {},
            error: () => {},
            trace: () => {}
        };
        const iam = {
            middleware(req, res, next) {
                req.user = {
                    sub: '123',
                    permissions: []
                };
                return next();
            },
            can
        };
        server = new Server({config, logger, iam, eventBus});
        await server.start();

        await Component.deleteMany({});
    });

    afterEach(async () => {
        await server.stop();
    });

    it('should return empty array', async () => {
        const { body, statusCode } = await request(server.getApp()).get('/components');
        expect(statusCode).to.equal(200);
        expect(body).to.deep.equal({
            data: [],
            meta: {
                page: 1,
                perPage: 50,
                total: 0,
                totalPages: 0
            }
        });
    });

    it('should return components array', async () => {
        const privateComp = await Component.create({
            name: 'Test',
            artifactId: 'abc',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                {id: '123', type: 'user'}
            ]
        });

        const publicComp = await Component.create({
            name: 'Public component',
            artifactId: 'def',
            description: 'Test description',
            access: 'public',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                {id: '456', type: 'user'}
            ]
        });

        const { body, statusCode } = await request(server.getApp()).get('/components');
        expect(statusCode).to.equal(200);
        expect(body.data.length).to.equal(2);

        delete body.data[0].createdAt;
        delete body.data[0].updatedAt;
        delete body.data[1].createdAt;
        delete body.data[1].updatedAt;

        expect(body).to.deep.equal({
            data: [
                {
                    'access': 'private',
                    'artifactId': 'abc',
                    'description': 'Test description',
                    'distribution': {
                        'type': 'docker',
                        'image': 'kokoko'
                    },
                    'id': privateComp.id,
                    'isGlobal': false,
                    'active': false,
                    'name': 'Test',
                    'owners': [
                        {
                            'id': '123',
                            'type': 'user'
                        }
                    ]
                },
                {
                    'access': 'public',
                    'artifactId': 'def',
                    'description': 'Test description',
                    'distribution': {
                        'type': 'docker',
                        'image': 'kokoko'
                    },
                    'id': publicComp.id,
                    'isGlobal': false,
                    'active': false,
                    'name': 'Public component',
                    'owners': [
                        {
                            'id': '456',
                            'type': 'user'
                        }
                    ]
                }
            ],
            meta: {
                page: 1,
                perPage: 50,
                total: 2,
                totalPages: 1
            }
        });
    });

    it('should filter by artifactId', async () => {

      await Component.create({
          name: 'Test',
          artifactId: 'artifact_abc',
          description: 'Test description',
          distribution: {
              image: 'kokoko'
          },
          owners: [
              {id: '123', type: 'user'}
          ]
      });

      await Component.create({
          name: 'Public component',
          artifactId: 'artifact_def',
          description: 'Test description',
          access: 'public',
          distribution: {
              image: 'kokoko'
          },
          owners: [
              {id: '456', type: 'user'}
          ]
      });

        await Component.create({
            name: 'One more public comp',
            artifactId: 'artifact_abc',
            version: 2,
            description: 'Test description',
            access: 'public',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                {id: '456', type: 'user'}
            ]
        });

        const firstResponse = await request(server.getApp()).get('/components');
        expect(firstResponse.statusCode).to.equal(200);
        expect(firstResponse.body.data.length).to.equal(3);

        const secondResponse = await request(server.getApp()).get('/components').query({artifactId: 'artifact_abc'});
        expect(secondResponse.statusCode).to.equal(200);
        expect(secondResponse.body.data.length).to.equal(2);

        const thirdResponse = await request(server.getApp()).get('/components').query({artifactId: 'artifact_def'});
        expect(thirdResponse.statusCode).to.equal(200);
        expect(thirdResponse.body.data.length).to.equal(1);

    });
});
