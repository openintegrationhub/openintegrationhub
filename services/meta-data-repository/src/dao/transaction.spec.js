const getPort = require('get-port');
const mongoose = require('mongoose');
const iamMock = require('../../test/iamMock');
const Server = require('../server');
const { SchemaDAO, DomainDAO } = require('./');

let port;
let server;

describe('Transaction', () => {
    beforeAll(async () => {
        port = await getPort();
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'transaction'),
            port,
        });
        iamMock.setup();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('just a test', async () => {
        // create dummy domain first
        const domain = await DomainDAO.create({
            name: 'foo',
            description: 'bar',
            public: true,
        });

        // create empty collection
        await SchemaDAO.createCollection();

        // start session
        const session = await mongoose.startSession();
        session.startTransaction();

        await SchemaDAO.create({
            obj: {
                name: 'foo',
                domainId: domain._id,
                uri: 'my/uri',
                value: JSON.stringify({}),
                refs: [],
                owners: {
                    id: 'foobar',
                    type: 'USER',
                },
            },
            options: { session },
        });

        expect(await SchemaDAO.findByURI({ uri: 'my/uri' })).toBeNull();
        expect(await SchemaDAO.findByURI({ uri: 'my/uri', options: { session } })).not.toBeNull();

        // commit transaction

        await session.commitTransaction();

        expect(await SchemaDAO.findByURI({ uri: 'my/uri' })).not.toBeNull();
    });
});
