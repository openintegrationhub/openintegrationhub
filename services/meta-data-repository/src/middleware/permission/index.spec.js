
const supertest = require('supertest');
const conf = require('../../conf');
const iamMock = require('../../../test/iamMock');
const Server = require('../../server');

let port;
let request;
let server;

describe('domains', () => {
    beforeAll(async () => {
        port = 5112;
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'permissions'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Request non existing domain', async () => {
        await request.get('/domains/fooooo')
            .set(...global.admin)
            .expect(404);

        await request.get('/domains/fooooo')
            .set(...global.user1)
            .expect(404);
    });

    test('Request existing domain', async () => {
        const payload = {
            name: 'foo',
            description: 'bar',
            // public: true,
        };


        const { data } = (await request.post('/domains')
            .set(...global.user1)
            .send(payload)
            .expect(200)).body;

        await request.get(`/domains/${data.id}`)
            .set(...global.user1)
            .expect(200);

        await request.get(`/domains/${data.id}`)
            .set(...global.tenantAdmin2)
            .expect(403);

        await request.get(`/domains/${data.id}`)
            .set(...global.admin)
            .expect(200);
    });

    test('Test tenant access', async () => {
        const payload = {
            name: 'foo',
            description: 'bar',
            // public: true,
        };

        const globalPayload = {
            name: 'fooglobal',
            description: 'bar',
            public: true,
        };

        let { data } = (await request.post('/domains')
            .set(...global.tenantAdmin1)
            .send(payload)
            .expect(200)).body;

        let globalData = (await request.post('/domains')
            .set(...global.admin)
            .send(globalPayload)
            .expect(200)).body;

        const domainId = data.id;
        const globalDomainId = globalData.data.id;

        await request.get(`/domains/${domainId}`)
            .set(...global.tenantUser1)
            .expect(200);

        await request.get(`/domains/${domainId}`)
            .set(...global.tenantAdmin1)
            .expect(200);

        await request.get(`/domains/${domainId}`)
            .set(...global.tenantUser2)
            .expect(403);

        await request.get(`/domains/${globalDomainId}`)
            .set(...global.tenantUser1)
            .expect(200);

        await request.get(`/domains/${globalDomainId}`)
            .set(...global.tenantUser2)
            .expect(200);

        // await request.get(`/domains/${domainId}`)
        //     .set(...global.tenantAdmin1)
        //     .expect(200);
        //
        // await request.get(`/domains/${domainId}`)
        //     .set(...global.tenantAdmin2)
        //     .expect(403);
        //
        // await request.get(`/domains/${domainId}`)
        //     .set(...global.tenantUser2)
        //     .expect(403);

        await request.get(`/domains/${domainId}`)
            .set(...global.admin)
            .expect(200);

        data = (await request.post(`/domains/${domainId}/schemas`)
            .set(...global.tenantAdmin1)
            .send({
                value: {
                    $id: 'boo',
                },
            })
            .expect(200)).body.data;

        const schemaUri = data.uri.replace('/api/v1', '');

        await request.post(`/domains/${domainId}/schemas`)
            .set(...global.tenantUser2)
            .send({

                value: {
                    $id: 'boo',
                },

            })
            .expect(403);


        await request.post(`/domains/${domainId}/schemas`)
            .set(...global.tenantAdmin2)
            .send({
                value: {
                    $id: 'boo',
                },
            })
            .expect(403);

        let res = await request.post(`/domains/${domainId}/schemas`)
            .set(...global.admin)
            .send({
                value: {
                    $id: 'boo1',
                },
            })
            .expect(200);

        expect(res.body.data.owners[0].id).toEqual('ta1');
        res = await request.post(`/domains/${domainId}/schemas`)
            .set(...global.tenantAdmin1)
            .send({
                value: {
                    $id: 'boo2',
                },
            })
            .expect(200);
        expect(res.body.data.owners[0].id).toEqual('ta1');

        await request.get(schemaUri)
            .set(...global.tenantUser1)
            .expect(200);

        await request.get(schemaUri)
            .set(...global.tenantAdmin1)
            .expect(200);

        await request.get(schemaUri)
            .set(...global.tenantAdmin2)
            .expect(403);

        await request.get(schemaUri)
            .set(...global.tenantUser2)
            .expect(403);
    });

    test('Request all domains available to tenant admin', async () => {
        const payload = {
            name: 'foo',
            description: 'bar',
            // public: true,
        };

        await request.post('/domains')
            .set(...global.tenantAdmin2)
            .send(payload)
            .expect(200);

        await request.post('/domains')
            .set(...global.tenantAdmin2)
            .send(payload)
            .expect(200);

        await request.post('/domains')
            .set(...global.tenantAdmin22)
            .send(payload)
            .expect(200);


        let result = (await request.get('/domains')
            .set(...global.tenantUser2)
            .expect(200)).body;

        expect(result.meta.total).toEqual(3);

        result = (await request.get('/domains')
            .set(...global.tenantAdmin22)
            .expect(200)).body;

        expect(result.meta.total).toEqual(3);

        result = (await request.get('/domains')
            .set(...global.tenantAdmin2)
            .expect(200)).body;

        expect(result.meta.total).toEqual(3);
    });
});
