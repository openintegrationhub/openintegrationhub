const supertest = require('supertest');
const Server = require('../../server');

let port;
let request;

describe('error', () => {
    beforeAll(async () => {
        port = 5104;
        const host = `http://localhost:${port}`;
        request = supertest(host);
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
