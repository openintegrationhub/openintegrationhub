const getPort = require('get-port');
const supertest = require('supertest');
const Server = require('../../server');

let port;
let request;
let server;

describe('domains', () => {
    beforeAll(async () => {
        port = await getPort();
        request = supertest(`http://localhost:${port}`);
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-domains`,
            port,
        });
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Cluster tools', async () => {
        await request.get('/healthcheck')
            .expect(200);
    });
});
