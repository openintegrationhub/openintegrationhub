const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');

let port;
let request;
let server;

describe('root', () => {
    beforeAll(async (done) => {
        port = 5108;
        request = supertest(`http://localhost:${port}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'route-root'),
            port,
        });
        await server.start();
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('Service Info', async () => {
        const res = await request.get('/')
            .expect(200);

        expect(res.body.data).toEqual(conf.wellKnown);
    });
});
