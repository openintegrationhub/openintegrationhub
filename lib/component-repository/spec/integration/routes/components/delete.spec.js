const Server = require('../../../../src/Server');
const supertest = require('supertest');
const { expect } = require('chai');
const Component = require('../../../../src/models/Component');
const EventBusMock = require('../../EventBusMock');
const { can } = require('@openintegrationhub/iam-utils');

describe('DELETE /components/:id', () => {
    let server;
    let request;

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
                        'components.delete'
                    ]
                };
                return next();
            },
            can
        };
        server = new Server({config, logger, iam, eventBus});
        request = supertest(await server.start());

        await Component.deleteMany({});
    });

    afterEach(async () => {
        await server.stop();
    });

    it('should delete component', async () => {
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
        const result = await request.delete('/components/' + component.id);

        expect(result.statusCode).to.equal(204);
        expect(await Component.findById(component.id)).to.be.null;
    });

    it('should return 404', async () => {
        const { body, statusCode } = await request.delete('/components/5cda861b119a4020a0d504b4');
        expect(statusCode).to.equal(404);
        expect(body).to.deep.equal({
            'errors': [
                {
                    'message': 'Component is not found'
                }
            ]
        });
    });
});

