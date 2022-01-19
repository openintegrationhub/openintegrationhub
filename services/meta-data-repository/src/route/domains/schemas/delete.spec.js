
const supertest = require('supertest');
const conf = require('../../../conf');
const iamMock = require('../../../../test/iamMock');
const Server = require('../../../server');

let port;
let request;
let server;

describe('schemas', () => {
    beforeAll(async () => {
        port = 5108;
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'schemas-delete'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('delete', async () => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        const schema1 = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/base.json',
            title: 'Base',
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

        // import schema1
        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema1,
            })
            .expect(200);

        const result1 = (await request.get(`/domains/${domain_.data.id}/schemas/base.json`)
            .set(...global.user1)
            .expect(200)).body;

        // create with reference to schema1
        const schema2 = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/addition.json',
            title: 'Addition',
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Name of the organization',
                    example: 'Great Company',
                },
                logosss: {
                    type: 'string',
                    description: 'Logo of the organization',
                    example: 'http://example.org/logo.png',
                },
                foo: {
                    $ref: result1.data.value.$id,
                },
            },
        };


        // import schema2
        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema2,
            })
            .expect(200);

        const result2 = (await request.get(`/domains/${domain_.data.id}/schemas/addition.json`)
            .set(...global.user1)
            .expect(200)).body;

        // create with reference to schema2
        const schema3 = {
            $schema: 'http://json-schema.org/schema#',
            $id: 'https://github.com/addition2.json',
            title: 'Addition',
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Name of the organization',
                    example: 'Great Company',
                },
                logosss: {
                    type: 'string',
                    description: 'Logo of the organization',
                    example: 'http://example.org/logo.png',
                },
                foo: {
                    $ref: result2.data.value.$id,
                },
            },
        };

        // import schema3
        await request.post(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .send({
                value: schema3,
            })
            .expect(200);

        const result3 = (await request.get(`/domains/${domain_.data.id}/schemas/addition2.json`)
            .set(...global.user1)
            .expect(200)).body;

        // try to delete schema1
        await request.delete(`${result1.data.uri.replace('/api/v1', '')}`)
            .set(...global.user1)
            .expect(400);

        // try to delete schema2
        await request.delete(`${result2.data.uri.replace('/api/v1', '')}`)
            .set(...global.user1)
            .expect(400);

        // try to delete schema2 as user2
        await request.delete(`${result2.data.uri.replace('/api/v1', '')}`)
            .set(...global.tenantUser2)
            .expect(403);

        // try to delete schema2 as admin
        await request.delete(`${result2.data.uri.replace('/api/v1', '')}`)
            .set(...global.admin)
            .expect(400);

        // try to delete schema3
        await request.delete(`${result3.data.uri.replace('/api/v1', '')}`)
            .set(...global.user1)
            .expect(204);

        // try to delete schema1
        await request.delete(`${result1.data.uri.replace('/api/v1', '')}`)
            .set(...global.user1)
            .expect(400);

        // try to delete schema2
        await request.delete(`${result2.data.uri.replace('/api/v1', '')}`)
            .set(...global.user3)
            .expect(403);

        await request.delete(`${result2.data.uri.replace('/api/v1', '')}`)
            .set(...global.admin)
            .expect(204);

        // try to delete schema1
        await request.delete(`${result1.data.uri.replace('/api/v1', '')}`)
            .set(...global.user1)
            .expect(204);

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .expect(200)).body;

        expect(result.meta.total).toEqual(0);
    });
});
