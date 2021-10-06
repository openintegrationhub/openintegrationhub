
const supertest = require('supertest');
const conf = require('../../conf');
const iamMock = require('../../../test/iamMock');
const Server = require('../../server');

let port;
let request;
let server;

describe('domains', () => {
    beforeAll(async () => {
        port = 5106;
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'domains-delete'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('delete', async () => {
        const domain1 = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        const domain2 = {
            name: 'test2',
            description: 'bar',
            public: true,
        };

        const schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV1.json',
            title: 'Organization',
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Name of the organization',
                    example: 'Great Company',
                },
                logo: {
                    type: 'string',
                    description: 'Logo of the organization',
                    example: 'http://example.org/logo.png',
                },
            },

        };

        // create a domains
        let result = (await request.post('/domains')
            .set(...global.user1)
            .send(domain1)
            .expect(200)).body;

        domain1.id = result.data.id;

        // create a domain
        result = (await request.post('/domains')
            .set(...global.user1)
            .send(domain2)
            .expect(200)).body;

        domain2.id = result.data.id;

        const domain_ = result;

        // import schema
        result = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema,
            })
            .expect(200));

        // remove domain1 without schemas
        await request.delete(`/domains/${domain1.id}`)
            .set(...global.user1)
            .expect(200);

        await request.get(`/domains/${domain1.id}`)
            .set(...global.user1)
            .expect(404);

        // await request.get(`/domains/${domain1.id}`)
        //     .set(...global.admin)
        //     .expect(404);

        // remove domain2 with schemas
        await request.delete(`/domains/${domain2.id}`)
            .set(...global.user1)
            .expect(200);

        await request.get(`/domains/${domain2.id}`)
            .set(...global.user1)
            .expect(404);
    });
});
