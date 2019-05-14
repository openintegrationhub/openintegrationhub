const Server = require('../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const Component = require('../../../src/models/Component');

describe('GET /components', () => {
    let server;

    beforeEach(async () => {
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
                    sub: '123'
                };
                return next();
            },
            can() {
                return (req, res, next) => next()
            }
        };
        server = new Server({config, logger, iam});
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
        const component = await Component.create({
            name: 'Test',
            description: 'Test description',
            owners: [
                {id: '123', type: 'user'}
            ]
        });

        const { body, statusCode } = await request(server.getApp()).get('/components');
        expect(statusCode).to.equal(200);

        delete body.data[0].createdAt;
        delete body.data[0].updatedAt;
        expect(body).to.deep.equal({
            data: [
                {
                    'access': 'private',
                    'description': 'Test description',
                    'distribution': {
                        'type': 'docker'
                    },
                    'id': component.id,
                    'name': 'Test',
                    'owners': [
                        {
                            'id': '123',
                            'type': 'user'
                        }
                    ]
                }
            ],
            meta: {
                page: 1,
                perPage: 50,
                total: 1,
                totalPages: 1
            }
        });
    });
});

