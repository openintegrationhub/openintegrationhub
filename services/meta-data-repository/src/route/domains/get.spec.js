
const supertest = require('supertest');
const conf = require('../../conf');
const iamMock = require('../../../test/iamMock');
const Server = require('../../server');

let port;
let request;
let server;

describe('domains', () => {
    beforeAll(async () => {
        port = 5103;
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'domains-get'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('get', async () => {
        let result = (await request.get('/domains')
            .set(...global.user1)
            .expect(200)).body;

        expect(result.data).toHaveLength(0);
        expect(result.meta.page).toEqual(1);
        expect(result.meta.perPage).toEqual(10);
        expect(result.meta.total).toEqual(0);
        expect(result.meta.totalPages).toEqual(1);


        const data = {
            name: 'foo',
            description: 'bar',
            // public: true,
        };

        // create a domain
        result = (await request.post('/domains')
            .set(...global.user1)
            .send(data)
            .expect(200)).body;

        result = (await request.get(`/domains/${result.data.id}`)
            .set(...global.user1)
            .expect(200)).body;

        Object.keys(data).forEach((key) => {
            expect(result.data[key]).toEqual(data[key]);
        });

        // create a domain with another account
        result = (await request.post('/domains')
            .set(...global.tenantAdmin2)
            .send(data)
            .expect(200)).body;

        // retrieve domain with another account
        await request.get(`/domains/${result.data.id}`)
            .set(...global.user1)
            .expect(403);
    });
});
