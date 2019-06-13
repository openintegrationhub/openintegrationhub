const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const iamMock = require('../../../test/iamMock');
const Server = require('../../server');

let port;
let request;
let server;

describe('schemas', () => {
    beforeAll(async () => {
        port = await getPort();
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'schemas-post'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('post', async () => {
        const baseUrl = `http://localhost:${port}/api/v1`;
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        let schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV2.json',
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

        const domain_ = result;

        // import schema
        result = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({ data: schema })
            .expect(200));


        // get data by uri (regular request)
        result = (await request.get(`/domains/${domain_.data.id}/schemas/organizationV2.json`)
            .set(...global.user1)
            .expect(200));

        expect(result.body.data.value.$id).toEqual(`${baseUrl}/domains/${domain_.data.id}/schemas/organizationV2.json`);

        // import second schema with invalid reference

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV3.json',
            title: 'Organization',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}NOTEXISTING/schemas/organizationV2.json`,
                },
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

        result = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({ data: schema })
            .expect(400));

        // import second schema with valid reference

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV3.json',
            title: 'Organization',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}/schemas/organizationV2.json`,
                },
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

        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({ data: schema })
            .expect(200);

        // get data with schema json header
        const result1 = (await request.get(`/domains/${domain_.data.id}/schemas/organizationV3.json`)
            .set(...global.user1)
            .set('content-type', 'application/schema+json')
            .expect(200));

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV3.json',
            title: 'Organization2',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}/schemas/organizationV2.json#/NOT_EXISTING`,
                },
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

        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({ data: schema })
            .expect(400);

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV3.json',
            title: 'Organization2',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}/schemas/organizationV2.json#/properties/logo`,
                },
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

        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({ data: schema })
            .expect(200);


        const result2 = (await request.get(`/domains/${domain_.data.id}/schemas/organizationV3.json`)
            .set(...global.user1)
            .set('content-type', 'application/schema+json')
            .expect(200));

        expect(result1.body.title).not.toEqual(result2.body.title);
        expect(result1.body.uri).toEqual(result2.body.uri);
        expect(result1.body.$id).toEqual(result2.body.$id);

        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user2)
            .send({ data: schema })
            .expect(403);

        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.admin)
            .send({ data: schema })
            .expect(200);
    });
});
