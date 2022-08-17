const Server = require('../../../../src/Server');
const request = require('supertest');
const { expect } = require('chai');
const Component = require('../../../../src/models/Component');
const EventBusMock = require('../../EventBusMock');
const EventMock = require('../../EventMock');
const { can, hasOneOf } = require('@openintegrationhub/iam-utils');

const logger = require('bunyan').createLogger({ name: 'test-logger' });

describe('POST /components/global/:id/...', () => {
    let server;

    beforeEach(async () => {
        const eventBus = new EventBusMock();
        const eventMock = EventMock;
        const config = {
            get(key) {
                return this[key];
            },
            MONGODB_URI: process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        };
        // const logger = {
        //     info: () => { },
        //     debug: () => { },
        //     warn: () => { },
        //     error: () => { },
        //     trace: () => { }
        // };
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
        server = new Server({ config, logger, iam, eventBus, eventMock});
        await server.start();

        await Component.deleteMany({});
    });

    afterEach(async () => {
        await server.stop();
    });

    it('should not start a global component if permission is missing', async () => {
        const component = await Component.create({
            isGlobal: true,
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                { id: '123', type: 'user' }
            ]
        });

        const { body, statusCode } = await request(server.getApp()).post(`/components/global/${component.id}/start`);

        expect(statusCode).to.equal(403);

        expect(body.errors[0].message).to.equal('MISSING_PERMISSION');

    });

    it('should not stop a global component if permission is missing', async () => {
        const component = await Component.create({
            isGlobal: true,
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                { id: '123', type: 'user' }
            ]
        });

        const { body, statusCode } = await request(server.getApp()).post(`/components/global/${component.id}/stop`);

        expect(statusCode).to.equal(403);

        expect(body.errors[0].message).to.equal('MISSING_PERMISSION');

    });

});


let component;
describe('POST /components/global/:id/...', () => {
    let server;

    beforeEach(async () => {
        const eventBus = new EventBusMock();
        const eventMock = EventMock;
        const config = {
            get(key) {
                return this[key];
            },
            MONGODB_URI: process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        };
        // const logger = {
        //     info: () => { },
        //     debug: () => { },
        //     warn: () => { },
        //     error: () => { },
        //     trace: () => { }
        // };
        const iam = {
            middleware(req, res, next) {
                req.user = {
                    sub: '123',
                    permissions: ['all']
                };
                return next();
            },
            can,
            hasOneOf
        };
        server = new Server({ config, logger, iam, eventBus, eventMock});
        await server.start();

        await Component.deleteMany({});

        component = await Component.create({
            isGlobal: true,
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                { id: '123', type: 'user' }
            ]
        });
    });

    afterEach(async () => {
        await server.stop();
    });

    it('should return an error while starting a global component if the component is not found', async () => {
        const { body, statusCode } = await request(server.getApp()).post('/components/global/5e63c3a5e4232e4cd0274ac2/start');

        expect(statusCode).to.equal(404);

        expect(body.errors[0].message).to.equal('Component is not found');

    });

    it('should return an error while stopping a global component if the component is not found', async () => {
        const { body, statusCode } = await request(server.getApp()).post('/components/global/5e63c3a5e4232e4cd0274ac2/stop');

        expect(statusCode).to.equal(404);

        expect(body.errors[0].message).to.equal('Component is not found');

    });

    it('should start a global component by ID', async () => {
        const { body, statusCode } = await request(server.getApp()).post(`/components/global/${component.id}/start`);

        expect(statusCode).to.equal(200);

        expect(body).to.deep.equal({ message: 'Component started', code: 200 });
        const updatedComponent = await Component.findOne({ _id: component.id }).lean();
        expect(updatedComponent.active).to.be.true;
    });

    it('should stop a global component by ID', async () => {
        const { body, statusCode } = await request(server.getApp()).post(`/components/global/${component.id}/stop`);

        expect(statusCode).to.equal(200);

        expect(body).to.deep.equal({ message: 'Component stopped', code: 200 });
        const updatedComponent = await Component.findOne({ _id: component.id }).lean();
        expect(updatedComponent.active).to.be.false;
    });

    it('should not start a normal component by ID', async () => {
        const localComponent = await Component.create({
            isGlobal: false,
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                { id: '123', type: 'user' }
            ]
        });

        const { body, statusCode } = await request(server.getApp()).post(`/components/global/${localComponent.id}/start`);

        expect(statusCode).to.equal(401);

        expect(body).to.deep.equal({ errors: [{ message: 'Component is not global', code: 401 }] });
    });

    it('should not stop a normal component by ID', async () => {
        const localComponent = await Component.create({
            isGlobal: false,
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                { id: '123', type: 'user' }
            ]
        });

        const { body, statusCode } = await request(server.getApp()).post(`/components/global/${localComponent.id}/stop`);

        expect(statusCode).to.equal(401);

        expect(body).to.deep.equal({ errors: [{ message: 'Component is not global', code: 401 }] });
    });
});


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, (ms * 1000));
  });
}

describe('POST /components/restart/all', () => {
    let server;

    beforeEach(async () => {
        const eventBus = new EventBusMock();
        const eventMock = EventMock;
        const config = {
            get(key) {
                return this[key];
            },
            MONGODB_URI: process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        };
        // const logger = {
        //     info: () => { },
        //     debug: () => { },
        //     warn: () => { },
        //     error: () => { },
        //     trace: () => { }
        // };
        const iam = {
            middleware(req, res, next) {
                req.user = {
                    sub: '123',
                    permissions: ['all']
                };
                return next();
            },
            can,
            hasOneOf
        };

        server = new Server({ config, logger, iam, eventBus, eventMock});
        await server.start();

        await Component.deleteMany({});

        await Component.create({
            isGlobal: true,
            name: 'Test 1',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            active: true,
            owners: [
                { id: '123', type: 'user' }
            ]
        });

        await Component.create({
            isGlobal: true,
            name: 'Test 2',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            active: true,
            owners: [
                { id: '123', type: 'user' }
            ]
        });
    });

    afterEach(async () => {
        await server.stop();
    });


    it('should start a global component by ID', async () => {
        const { body, statusCode } = await request(server.getApp()).post(`/components/global/restart/all?emitThrottle=0&restartDelay=3`);

        expect(statusCode).to.equal(200);

        expect(body).to.deep.equal({ message: '2 Components will be restarted', code: 200 });
        await sleep(1);
        let updatedComponents = await Component.find({ isGlobal: true }).sort({createdAt: 1}).lean();
        expect(updatedComponents[0].name).to.equal('Test 1');
        expect(updatedComponents[1].name).to.equal('Test 2');
        expect(updatedComponents[0].active).to.be.false;
        expect(updatedComponents[1].active).to.be.false;
        await sleep(5);
        updatedComponents = await Component.find({ isGlobal: true }).sort({createdAt: 1}).lean();
        expect(updatedComponents[0].name).to.equal('Test 1');
        expect(updatedComponents[1].name).to.equal('Test 2');
        expect(updatedComponents[0].active).to.be.true;
        expect(updatedComponents[1].active).to.be.true;
    }).timeout(8000);

});
