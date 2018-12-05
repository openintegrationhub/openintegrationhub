const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');

let port;
let request;
let server;

describe('audits', () => {
    beforeAll(async () => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-audits`,
            port,
        });
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Get audit data for specific organisation', async () => {
        await request.get('/audits')
            .expect(200);
    });
});
