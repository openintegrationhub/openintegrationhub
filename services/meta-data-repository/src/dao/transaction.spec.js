
const mongoose = require('mongoose');
const iamMock = require('../../test/iamMock');
const Server = require('../server');
const { SchemaDAO, DomainDAO } = require('./');

let port;
let server;

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Transaction', () => {
    beforeAll(async () => {
        port = 5100;
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'transaction'),
            port,
        });
        iamMock.setup();
        await server.start();

        // wait until mongodb fully initialized
        await timeout(2000);
        //
    });

    afterAll(async () => {
        await server.stop();
    });

    test('just a transaction test', async () => {
        // create dummy domain first
        const domain = await DomainDAO.create({
            obj: {
                name: 'foo',
                description: 'bar',
                public: true,
            },
        });

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
