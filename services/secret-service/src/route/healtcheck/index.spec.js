const supertest = require('supertest');
const Server = require('../../server');

let port;
let request;
let server;

describe('healthcheck', () => {
    beforeAll(async (done) => {
        port = 5107;
        request = supertest(`http://localhost:${port}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'healthcheck'),
            port,
        });
        await server.start();
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('Cluster tools', async () => {
        await request.get('/healthcheck')
            .expect(200);
    });
});
