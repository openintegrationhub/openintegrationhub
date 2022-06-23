const {
    OA2_AUTHORIZATION_CODE,
} = require('../constant').AUTH_TYPE;
const AuthClientDAO = require('./auth-client');
const Server = require('../server');
const conf = require('../conf');

let port;
let server;
let authClient;

describe('AuthClientDAO', () => {
    beforeAll(async () => {
        conf.crypto.isDisabled = false;
        port = 5115;
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'auth-client-dao'),
            port,
        });
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('create auth client', async () => {
        const data = {
            type: OA2_AUTHORIZATION_CODE,
            name: 'oAuth2',
            clientId: 'string',
            clientSecret: 'string',
            redirectUri: '/dev/null',
            endpoints: {
                auth: 'http://',
                token: 'http://',
                userinfo: 'http://',
            },
            mappings: {
                externalId: {
                    source: 'id_token',
                    key: 'sub',
                },
            },
        };

        authClient = await AuthClientDAO.create(data);

        expect(authClient.type).toEqual(OA2_AUTHORIZATION_CODE);
    });

    test('create auth client refreshWithScope', async () => {
        const data = {
            type: OA2_AUTHORIZATION_CODE,
            name: 'oAuth2',
            clientId: 'string',
            clientSecret: 'string',
            redirectUri: '/dev/null',
            endpoints: {
                auth: 'http://',
                token: 'http://',
                userinfo: 'http://',
            },
            mappings: {
                externalId: {
                    source: 'id_token',
                    key: 'sub',
                },
            },
            refreshWithScope: true,
            predefinedScope: 'string',
        };

        authClient = await AuthClientDAO.create(data);

        expect(authClient.type).toEqual(OA2_AUTHORIZATION_CODE);
        expect(authClient.refreshWithScope).toEqual(true);
    });

    test('update auth client', async () => {
        const update = {
            name: 'foobar',
            type: OA2_AUTHORIZATION_CODE,
            clientId: 'string2',
            clientSecret: 'string2',
        };

        authClient = await AuthClientDAO.update({ id: authClient._id, data: update });

        expect(authClient.clientId).toEqual('string2');
        expect(authClient.clientSecret).toEqual('string2');
        expect(authClient.name).toEqual('foobar');
    });
});
