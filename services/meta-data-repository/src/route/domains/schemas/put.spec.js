
const supertest = require('supertest');
const conf = require('../../../conf');
const iamMock = require('../../../../test/iamMock');
const Server = require('../../../server');

let port;
let request;
let server;

describe('schemas', () => {
    beforeAll(async () => {
        port = 5109;
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

        // create a domain
        const domain_ = (await request.post('/domains')
            .set(...global.user1)
            .send(domain)
            .expect(200)).body;


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

        // import schema
        let created = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema,
            })
            .expect(200)).body;

        const schema2 = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV2.json',
            title: 'Organization2',
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
                base: {
                    $ref: JSON.parse(created.data.value).$id,
                },
            },
        };

        const schema3 = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV3.json',
            title: 'Organization3',
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
                base: {
                    $ref: JSON.parse(created.data.value).$id,
                },
            },
        };

        // import additional schemas
        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema2,
            })
            .expect(200);

        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema3,
            })
            .expect(200);


        // check created schemas

        await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .expect(200);

        // put data by uri (regular request)

        created = (await request.put(created.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                value: {
                    ...schema,
                    title: 'Org',
                },
            })
            .expect(200)).body;

        expect(created.data.name).toEqual('Org');
        expect(JSON.parse(created.data.value).title).toEqual('Org');

        created = (await request.put(created.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                name: 'foo',
                value: {
                    ...schema,
                    title: 'Org',
                },
            })
            .expect(200)).body;

        expect(created.data.name).toEqual('foo');
        expect(JSON.parse(created.data.value).title).toEqual('Org');

        created = (await request.put(created.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                name: 'foo',
                value: {
                    $schema: 'http://json-schema.org/schema#',
                    $id: 'https://github.com/organizationV1.json',
                    title: 'Org',
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
                },
            })
            .expect(200)).body;

        expect(created.data.name).toEqual('foo');
        expect(JSON.parse(created.data.value).title).toEqual('Org');

        await request.put(created.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                name: 'foo',
                id: 'lolololol',
                value: {
                    $schema: 'http://json-schema.org/schema#',
                    $id: 'asdasd',
                    title: 'Org',
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
                },
            })
            .expect(500);
    });

    test('put references', async () => {
        const domain = {
            name: 'test2',
            description: 'bar',
            public: true,
        };

        // create a domain
        const domain_ = (await request.post('/domains')
            .set(...global.user1)
            .send(domain)
            .expect(200)).body;


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

        // import schema
        const created1 = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema,
            })
            .expect(200)).body;

        const schema2 = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV2.json',
            title: 'Organization2',
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
                base: {
                    $ref: JSON.parse(created1.data.value).$id,
                },
            },
        };

        // import second schema with reference
        let created2 = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema2,
            })
            .expect(200)).body;

        expect(created2.data.refs.length).toEqual(1);

        const schema3 = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/organizationV3.json',
            title: 'Organization2',
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
                base: {
                    $ref: JSON.parse(created1.data.value).$id,
                },
            },
        };

        // import second schema with reference
        const created3 = (await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema3,
            })
            .expect(200)).body;

        expect(created3.data.refs.length).toEqual(1);

        // update and change reference
        created2 = (await request.put(created2.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                value: {
                    $schema: 'http://json-schema.org/schema#',
                    $id: 'https://github.com/organizationV2.json',
                    title: 'Organization2',
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
                        base: {
                            $ref: JSON.parse(created3.data.value).$id,
                        },
                    },
                },
            })
            .expect(200)).body;

        expect(created2.data.refs.length).toEqual(2);

        // update and change reference
        created2 = (await request.put(created2.data.uri.replace('/api/v1', ''))
            .set(...global.user1)
            .send({
                value: {
                    $schema: 'http://json-schema.org/schema#',
                    $id: 'https://github.com/organizationV2.json',
                    title: 'Organization2',
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
                },
            })
            .expect(200)).body;

        expect(created2.data.refs.length).toEqual(0);
    });
});
