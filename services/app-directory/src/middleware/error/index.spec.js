const supertest = require('supertest');
const Server = require('../../server');

let port;
let request;
let server;

describe('error', () => {
    beforeAll(async (done) => {
        port = 3020;
        const host = `http://localhost:${port}`;
        request = supertest(host);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'apps'),
            port,
        });
        await server.start();
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('status and message', async () => {
        await request.get('/404')
            .expect(404);
        await server.stop();
    });
});
