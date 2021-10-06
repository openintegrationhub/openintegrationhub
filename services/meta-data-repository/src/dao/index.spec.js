
const supertest = require('supertest');
const conf = require('../conf');
const iamMock = require('../../test/iamMock');
const Server = require('../server');

let port;
let request;
let server;

describe('DAO adapter', () => {
    beforeAll(async () => {
        port = 5101;
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'dao'),
            port,
            dao: {
                DomainDAO: {
                    async countBy() {
                        return 1337;
                    },
                    async findByEntityWithPagination() {
                        return 'fooo';
                    },
                },
            },
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('overwritten', async () => {
        const result = (await request.get('/domains')
            .set(...global.user1)
            .expect(200)).body;
        expect(result.data).toEqual('fooo');
        expect(result.meta.total).toEqual(1337);
    });
});
