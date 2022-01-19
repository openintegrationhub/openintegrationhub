
const supertest = require('supertest');
const conf = require('../../conf');
const iamMock = require('../../../test/iamMock');
const Server = require('../../server');

let port;
let request;
let server;

describe('domains', () => {
    beforeAll(async () => {
        port = 5104;
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'domains-put'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('put', async () => {
        const data = {
            name: 'foo',
            description: 'bar',
            // public: true,
        };

        // create a domain
        let result = (await request.post('/domains')
            .set(...global.user1)
            .send(data)
            .expect(200)).body;

        // update domain
        result = (await request.put(`/domains/${result.data.id}`)
            .set(...global.user1)
            .send({
                name: 'fooUpdate',
                description: 'bar',
                public: false,
            })
            .expect(200)).body;

        expect(result.data.name).toEqual('fooUpdate');
        expect(result.data.public).toBe(false);

        // put as admin
        await request.put(`/domains/${result.data.id}`)
            .set(...global.admin)
            .send({
                name: 'fooUpdate',
                description: 'bar',
                public: false,
            })
            .expect(200);

        // put as admin INVALID DOMAIN ID
        await request.put('/domains/not-existing')
            .set(...global.admin)
            .send({
                name: 'fooUpdate',
                description: 'bar',
                public: false,
            })
            .expect(404);

        // put as non authorized
        await request.put(`/domains/${result.data.id}`)
            .set(...global.tenantUser22)
            .send({
                name: 'fooUpdate',
                description: 'bar',
                public: false,
            })
            .expect(403);
    });
});
