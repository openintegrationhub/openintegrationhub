const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../../conf');
const iamMock = require('../../../../test/iamMock');
const Server = require('../../../server');

let port;
let request;
let server;

describe('schemas', () => {
    beforeAll(async () => {
        port = await getPort();
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'schemas-put'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('put', async () => {
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
            .send({ data: domain })
            .expect(200)).body;


        // import schema
        const created = (await request.post(`/domains/${result.data.id}/schemas`)
            .set(...global.user1)
            .send({
                data: {
                    value: schema,
                },
            })
            .expect(200)).body;

        // put data by uri (regular request)

        result = (await request.put(created.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                data: {
                    value: {
                        ...schema,
                        title: 'Org',
                    },
                },
            })
            .expect(200));

        expect(result.body.data.name).toEqual('Org');
        expect(JSON.parse(result.body.data.value).title).toEqual('Org');

        result = (await request.put(created.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                data: {
                    name: 'foo',
                    value: {
                        ...schema,
                        title: 'Org',
                    },
                },
            })
            .expect(200));

        expect(result.body.data.name).toEqual('foo');
        expect(JSON.parse(result.body.data.value).title).toEqual('Org');
    });
});
