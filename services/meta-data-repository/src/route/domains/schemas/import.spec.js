const getPort = require('get-port');
const supertest = require('supertest');
const path = require('path');

const conf = require('../../../conf');
const { pack } = require('../../../packing');
const iamMock = require('../../../../test/iamMock');
const Server = require('../../../server');

let port;
let request;
let server;

describe('schemas', () => {
    beforeAll(async () => {
        port = await getPort();
        conf.port = port;

        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'schemas-import'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('import - no media', async () => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        // create a domain
        const result = (await request.post('/domains')
            .set(...global.user1)
            .send({ data: domain })
            .expect(200)).body;

        const domain_ = result;

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user1)
            .expect(400);
    });

    test('import - zip', async () => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        // create a domain
        let result = (await request.post('/domains')
            .set(...global.user1)
            .send({ data: domain })
            .expect(200)).body;

        const domain_ = result;

        // create zip file
        // create archive
        const src = path.resolve(__dirname, '../../../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../../test-temp/temp.zip');

        // pack
        await pack(
            'zip',
            src,
            packDest,
        );

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user1)
            .attach('archive', packDest)
            .expect(200);

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .expect(200)).body;

        expect(result.meta.total).toEqual(20);
    });

    test('import - tgz', async () => {
        const domain = {
            name: 'test',
            description: 'bar',
            public: true,
        };

        // create a domain
        let result = (await request.post('/domains')
            .set(...global.user1)
            .send({ data: domain })
            .expect(200)).body;

        const domain_ = result;

        // create archive
        const src = path.resolve(__dirname, '../../../../test/data/valid');
        const packDest = path.resolve(__dirname, '../../../test-temp/temp.tgz');

        // pack
        await pack(
            'tgz',
            src,
            packDest,
        );

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user1)
            .attach('archive', packDest)
            .expect(200);

        await request.post(`/domains/${domain_.data.id}/schemas/import`)
            .set(...global.user2)
            .attach('archive', packDest)
            .expect(403);

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user2)
            .expect(403)).body;

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.user1)
            .expect(200)).body;

        expect(result.meta.total).toEqual(20);
        expect(result.meta.perPage).toEqual(10);
        expect(result.meta.totalPages).toEqual(2);
        expect(result.data.length).toEqual(10);

        result = (await request.get(`/domains/${domain_.data.id}/schemas`)
            .set(...global.admin)
            .expect(200)).body;

        expect(result.meta.total).toEqual(20);
        expect(result.meta.perPage).toEqual(10);
        expect(result.meta.totalPages).toEqual(2);
        expect(result.data.length).toEqual(10);
    });
});
