const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const iamMock = require('../../../test/iamMock');
const Server = require('../../server');

let port;
let request;
let server;

describe('domains', () => {
    beforeAll(async () => {
        port = await getPort();
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

    // test('Request non existing domain', async () => {
    //     await request.get('/domains/fooooo')
    //         .set(...global.admin)
    //         .expect(404);

    //     await request.get('/domains/fooooo')
    //         .set(...global.user1)
    //         .expect(403);
    // });

    // test('Request existing domain', async () => {
    //     const payload = {
    //         name: 'foo',
    //         description: 'bar',
    //         public: true,
    //     };

    //     const { data } = (await request.post('/domains')
    //         .set(...global.user1)
    //         .send({ data: payload })
    //         .expect(200)).body;

    //     await request.get(`/domains/${data.id}`)
    //         .set(...global.user1)
    //         .expect(200);

    //     await request.get(`/domains/${data.id}`)
    //         .set(...global.user2)
    //         .expect(403);

    //     await request.get(`/domains/${data.id}`)
    //         .set(...global.admin)
    //         .expect(200);
    // });

    test('Test tenant access', async () => {
        const payload = {
            name: 'foo',
            description: 'bar',
            public: true,
        };

        const { data } = (await request.post('/domains')
            .set(...global.tenantUser1)
            .send({ data: payload })
            .expect(200)).body;

        await request.get(`/domains/${data.id}`)
            .set(...global.tenantUser1)
            .expect(200);

        await request.get(`/domains/${data.id}`)
            .set(...global.tenantAdmin1)
            .expect(200);

        await request.get(`/domains/${data.id}`)
            .set(...global.tenantAdmin2)
            .expect(403);

        await request.get(`/domains/${data.id}`)
            .set(...global.admin)
            .expect(200);
    });
});
