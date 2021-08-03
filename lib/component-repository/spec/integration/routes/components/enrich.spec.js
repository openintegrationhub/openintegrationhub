const Server = require('../../../../src/Server');
const nock = require('nock');
const request = require('supertest');
const { expect } = require('chai');
const Component = require('../../../../src/models/Component');
const EventBusMock = require('../../EventBusMock');
const { can, hasOneOf } = require('@openintegrationhub/iam-utils');

describe('PATCH /components/enrich/:id', () => {
    let server;

    beforeEach(async () => {
        const eventBus = new EventBusMock();
        const config = {
            get(key) {
                return this[key];
            },
            MONGODB_URI: process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        };
        const logger = {
            info: () => { },
            debug: () => { },
            warn: () => { },
            error: () => { },
            trace: () => { }
        };
        const iam = {
            middleware(req, res, next) {
                req.user = {
                    sub: '123',
                    permissions: ['components.update']
                };
                return next();
            },
            can,
            hasOneOf
        };
        server = new Server({ config, logger, iam, eventBus });
        await server.start();

        await Component.deleteMany({});

        nock('https://raw.githubusercontent.com')
        .get('/openintegrationhub/wice-adapter/master/component.json')
        .times(2)
        .reply(200, {
          triggers:{
              getPersonsPolling:{
                 'title':'Fetch new and updated persons(getPersons - Polling)',
                 'description':'Get Snazzy Contacts persons which have recently been modified or created',
                 'type':'polling',
                 'main':'./lib/triggers/getPersonsPolling.js',
                 'metadata':{
                    'in':'./lib/schemas/getPersons.in.json',
                    'out':'./lib/schemas/getPersons.out.json'
                 }
              }
          },
           actions:{
              upsertPerson:{
                 'title':'Upsert a person in Snazzy Contacts',
                 'main':'./lib/actions/upsertPerson.js',
                 'metadata':{
                    'in':'./lib/schemas/upsertPerson.in.json',
                    'out':'./lib/schemas/upsertPerson.out.json'
                 }
              }
          }
        });

        nock('https://raw.githubusercontent.com')
        .get('/openintegrationhub/wice-adapter/master/Readme.md')
        .times(2)
        .reply(200, 'Hello world')

        nock('https://raw.githubusercontent.com')
        .get('/openintegrationhub/wice-adapter/master/lib/schemas/getPersons.in.json')
        .reply(200, {
          getPersonsIn: 'done',
        });

        nock('https://raw.githubusercontent.com')
        .get('/openintegrationhub/wice-adapter/master/lib/schemas/getPersons.out.json')
        .reply(200, {
          getPersonsOut: 'done',
        });

        nock('https://raw.githubusercontent.com')
        .get('/openintegrationhub/wice-adapter/master/lib/schemas/upsertPerson.in.json')
        .reply(200, {
          upsertPersonIn: 'done',
        });

        nock('https://raw.githubusercontent.com')
        .get('/openintegrationhub/wice-adapter/master/lib/schemas/upsertPerson.out.json')
        .reply(200, {
          upsertPersonOut: 'done',
        });
    });

    afterEach(async () => {
        await server.stop();
    });

    it('should return 404', async () => {
        const { body, statusCode } = await request(server.getApp()).patch('/components/enrich/' + new Component().id);
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
                { id: '456', type: 'user' }
            ]
        });

        const { body, statusCode } = await request(server.getApp()).patch('/components/enrich/' + component.id);
        expect(body).to.deep.equal({
            errors: [
                {
                    message: 'Not authorized'
                }
            ]
        });
        expect(statusCode).to.equal(403);
    });

    it('should return 400', async () => {
        const component = await Component.create({
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                { id: '123', type: 'user' }
            ]
        });

        const { body, statusCode } = await request(server.getApp()).patch('/components/enrich/' + component.id);
        expect(body).to.deep.equal({
            errors: [
                {
                    message: 'Missing Repository URL'
                }
            ]
        });
        expect(statusCode).to.equal(400);

        await Component.deleteOne({_id: component.id})
    });

    it('should enrich the component', async () => {
        const component = await Component.create({
            name: 'Test',
            description: 'Test description',
            distribution: {
                image: 'kokoko'
            },
            owners: [
                { id: '123', type: 'user' }
            ]
        });

        const { statusCode } = await request(server.getApp()).patch('/components/enrich/' + component.id).query({repository: 'https://github.com/openintegrationhub/wice-adapter'});
        expect(statusCode).to.equal(204);

        const updatedComponent = await Component.findById(component.id).lean()
        expect(updatedComponent.repository).to.equal('https://github.com/openintegrationhub/wice-adapter')
        expect(updatedComponent.rating).to.deep.equal({interoperability: {
          get: true,
          post: true,
          put: true,
          upsert: true,
          delete: false,
          error: false
        },
        documentation: { readme: true, size: false, error: false }
      })


        expect(updatedComponent.actions.upsertPerson.metadata.in).to.have.property('upsertPersonIn');
        expect(updatedComponent.actions.upsertPerson.metadata.out).to.have.property('upsertPersonOut');

        expect(updatedComponent.actions.upsertPerson.metadata.in.upsertPersonIn).to.equal('done');
        expect(updatedComponent.actions.upsertPerson.metadata.out.upsertPersonOut).to.equal('done');

        expect(updatedComponent.triggers.getPersonsPolling.metadata.in).to.have.property('getPersonsIn');
        expect(updatedComponent.triggers.getPersonsPolling.metadata.out).to.have.property('getPersonsOut');

        expect(updatedComponent.triggers.getPersonsPolling.metadata.in.getPersonsIn).to.equal('done');
        expect(updatedComponent.triggers.getPersonsPolling.metadata.out.getPersonsOut).to.equal('done');
    });


});
