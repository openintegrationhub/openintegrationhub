
const supertest = require('supertest');
const path = require('path');

const conf = require('../../../conf');
const { pack } = require('../../../packing');
const iamMock = require('../../../../test/iamMock');
const Server = require('../../../server');

let port;
let request;
let server;

describe('schemas', () => {
    beforeAll(async () => {
        port = 5114;
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

        expect(result.body.data.value.$id).toEqual(`${baseUrl}/domains/${domain_.data.id}/schemas/organizationV1.json`);

        // import second schema with invalid reference

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV2.json',
            title: 'Organization',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}NOTEXISTING/schemas/organizationV1.json`,
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
            .send({
                value: schema,
            })
            .expect(400));

        // import second schema with valid reference

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV3.json',
            title: 'Organization',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}/schemas/organizationV1.json`,
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
            .send({
                value: schema,
            })
            .expect(200);

        // get data with schema json header
        await request.get(`/domains/${domain_.data.id}/schemas/organizationV3.json`)
            .set(...global.user1)
            .set('content-type', 'application/schema+json')
            .expect(200);

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV4.json',
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
            .send(schema)
            .expect(400);

        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV5.json',
            title: 'Organization2',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}/schemas/organizationV1.json#/properties/logo`,
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
            .send({
                value: schema,
            })
            .expect(200);


        await request.get(`/domains/${domain_.data.id}/schemas/organizationV5.json`)
            .set(...global.user1)
            .set('content-type', 'application/schema+json')
            .expect(200);


        schema = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV5.json',
            title: 'Organization2',
            type: 'object',
            properties: {
                someRef: {
                    $ref: `${baseUrl}/domains/${domain_.data.id}/schemas/organizationV1.json#/properties/logo`,
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
            .send({
                name: 'string',
                description: 'string',
                value: {
                    $id: '#?address',
                    required: [
                        'street_address',
                        'city',
                        'state',
                    ],
                    properties: {
                        street_address: {
                            type: 'string',
                        },
                        city: {
                            type: 'string',
                        },
                        state: {
                            type: 'string',
                        },
                    },
                },
            })
            .expect(200);

        await request.get(`/domains/${domain_.data.id}/schemas/address`)
            .set(...global.user1)
            .set('content-type', 'application/schema+json')
            .expect(200);
    });

    test('import - no media', async () => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        // create a domain
        const result = (await request.post('/domains')
            .set(...global.user1)
            .send(domain)
            .expect(200)).body;

        const domain_ = result;

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user1)
            .expect(400);
    });

    test('import - zip', async () => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        // create a domain
        let result = (await request.post('/domains')
            .set(...global.user1)
            .send(domain)
            .expect(200)).body;

        const domain_ = result;

        // create zip file
        const src = path.resolve(__dirname, '../../../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../../test-temp/temp.zip');

        // pack
        await pack(
            'zip',
            src,
            packDest,
        );

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user1)
            .attach('archive', packDest)
            .expect(200);

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .expect(200)).body;

        expect(result.meta.total).toEqual(20);
    });

    test('import - tgz', async () => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        // create a domain
        let result = (await request.post('/domains')
            .set(...global.user1)
            .send(domain)
            .expect(200)).body;

        const domain_ = result;

        // create archive
        const src = path.resolve(__dirname, '../../../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../../test-temp/temp.tgz');

        // pack
        await pack(
            'tgz',
            src,
            packDest,
        );

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user1)
            .attach('archive', packDest)
            .expect(200);

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user3)
            .attach('archive', packDest)
            .expect(403);

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.tenantAdmin1)
            .expect(403)).body;

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .expect(200)).body;

        expect(result.meta.total).toEqual(20);
        expect(result.meta.perPage).toEqual(10);
        expect(result.meta.totalPages).toEqual(2);
        expect(result.data.length).toEqual(10);

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.admin)
            .expect(200)).body;

        expect(result.meta.total).toEqual(20);
        expect(result.meta.perPage).toEqual(10);
        expect(result.meta.totalPages).toEqual(2);
        expect(result.data.length).toEqual(10);

        for (const schema of result.data) {
            await request.get(schema.uri.replace('/api/v1', ''))
                .set(...global.user1)
                .expect(200);
        }
    });
});
