const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const Component = require('../../../../src/models/Component');
const EventBusMock = require('../../EventBusMock');
const { can, hasOneOf } = require('@openintegrationhub/iam-utils');

describe('GET /components/:id', () => {
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
            can,
            hasOneOf
        };
        server = new Server({config, logger, iam, eventBus});
        await server.start();

        await Component.deleteMany({});
    });

    afterEach(async () => {
        await server.stop();
    });

    it('should return 404', async () => {
        const { body, statusCode } = await request(server.getApp()).get('/components/' + new Component().id);
        expect(body).to.deep.equal({
            'errors': [
                {
                    'message': 'Component is not found'
                }
            ]
        });
        expect(statusCode).to.equal(404);
    });

    it('should return 403', async () => {
        const component = await Component.create({
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                {id: '456', type: 'user'}
            ]
        });

        const { body, statusCode } = await request(server.getApp()).get('/components/' + component.id);
        expect(body).to.deep.equal({
            errors: [
                {
                    message: 'Not authorized'
                }
            ]
        });
        expect(statusCode).to.equal(403);
    });

    it('should return private component by ID', async () => {
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

        const { body, statusCode } = await request(server.getApp()).get('/components/' + component.id);
        expect(statusCode).to.equal(200);

        delete body.data.createdAt;
        delete body.data.updatedAt;
        expect(body).to.deep.equal({
            data: {
                'access': 'private',
                'description': 'Test description',
                'distribution': {
                    'type': 'docker',
                    'image': 'kokoko'
                },
                'id': component.id,
                'name': 'Test',
                'owners': [
                    {
                        'id': '123',
                        'type': 'user'
                    }
                ]
            },
            meta: {}
        });
    });

    it('should return public component by ID', async () => {
        const component = await Component.create({
            name: 'Test',
            description: 'Test description',
            access: 'public',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                {id: '456', type: 'user'}
            ]
        });

        const { body, statusCode } = await request(server.getApp()).get('/components/' + component.id);
        expect(statusCode).to.equal(200);

        delete body.data.createdAt;
        delete body.data.updatedAt;
        expect(body).to.deep.equal({
            data: {
                'access': 'public',
                'description': 'Test description',
                'distribution': {
                    'type': 'docker',
                    'image': 'kokoko'
                },
                'id': component.id,
                'name': 'Test',
                'owners': [
                    {
                        'id': '456',
                        'type': 'user'
                    }
                ]
            },
            meta: {}
        });
    });
});

