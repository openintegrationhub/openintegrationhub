
const supertest = require('supertest');
const Server = require('../../server');

let port;
let request;

describe('error', () => {
    beforeAll(async (done) => {
        port = 5111;
        const host = `http://localhost:${port}`;
        request = supertest(host);
        done();
    });
    test('status and message', async () => {
        const server = new Server({
            port,
        });

        await server.start();
        await request.get('/404')
            .expect(404);
        await server.stop();
    });
});
