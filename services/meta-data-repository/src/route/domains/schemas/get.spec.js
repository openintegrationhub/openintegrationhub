
const supertest = require('supertest');
const conf = require('../../../conf');
const iamMock = require('../../../../test/iamMock');
const Server = require('../../../server');

let port;
let request;
let server;

describe('schemas', () => {
    beforeAll(async () => {
        port = 5107;
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'schemas-get'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('get', async () => {
        const domain = {
            name: 'test',
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

        // create a domain
        let result = (await request.post('/domains')
            .set(...global.user1)
            .send(domain)
            .expect(200)).body;

        const domain_ = result;

        // import schema
        result = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema,
            })
            .expect(200));


        // get data by uri (regular request)
        result = (await request.get(`/domains/${domain_.data.id}/schemas/organizationV1.json`)
            .set(...global.user1)
            .expect(200));

        // get all schemas
        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .expect(200));

        expect(result.body.meta.total).toEqual(1);
    });
});
