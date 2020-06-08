const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const Component = require('../../../../src/models/Component');
const EventBusMock = require('../../EventBusMock');
const { can } = require('@openintegrationhub/iam-utils');

describe('PATCH /components/:id', () => {
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
                    permissions: [
                        'components.update'
                    ]
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

    it('should return 404', async () => {
        const { body, statusCode } = await request(server.getApp()).patch('/components/' + new Component().id);
        expect(statusCode).to.equal(404);
        expect(body).to.deep.equal({
            'errors': [
                {
                    'message': 'Component is not found'
                }
            ]
        });
    });

    it('should path component', async () => {
        const component = await Component.create({
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                {id: '123', type: 'user'}
            ]
        });

        const { body, statusCode } = await request(server.getApp())
            .patch('/components/' + component.id)
            .send({
                data: {
                    name: 'Updated name',
                    description: 'Updated description'
                }
            });

        delete body.data.createdAt;
        delete body.data.updatedAt;
        expect(body).to.deep.equal({
            data: {
                'isGlobal': false,
                'name': 'Updated name',
                'description': 'Updated description',
                'access': 'private',
                'distribution': {
                    'type': 'docker',
                    'image': 'kokoko'
                },
                'id': component.id,
                'owners': [
                    {
                        'id': '123',
                        'type': 'user'
                    }
                ]
            },
            meta: {}
        });
        expect(statusCode).to.equal(200);
    });
});
