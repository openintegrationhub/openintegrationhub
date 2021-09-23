const supertest = require('supertest');
const crypto = require('crypto');
const iamMock = require('../../../test/iamMock');
const conf = require('../../../conf');
const Server = require('../../../server');
const {
    OA2_AUTHORIZATION_CODE,
} = require('../../../constant').AUTH_TYPE;

let port;
let request;
let server;
let authClient;

describe('default key adapter', () => {
    beforeAll(async () => {
        port = 5101;
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        conf.crypto.isDisabled = false;
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'key-global'),
            port,
        });
        await server.start();
        iamMock.setup();

        const data = {
            type: OA2_AUTHORIZATION_CODE,
            name: 'oAuth2',
            clientId: 'string',
            clientSecret: 'string',
            redirectUri: '/dev/null',
            endpoints: {
                auth: 'http://www.example.com/auth',
                token: 'http://www.example.com/token',
                userinfo: 'http://www.example.com/user',
            },
            mappings: {
                externalId: {
                    source: 'id_token',
                    key: 'sub',
                },
            },
        };

        authClient = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({ data })
            .expect(200)).body.data;
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Encrypts secret with key', async () => {
        const key = conf.crypto.key;
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';

        const secret = (await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'secret',
                    type: OA2_AUTHORIZATION_CODE,
                    value: {
                        authClientId: authClient._id,
                        accessToken,
                        refreshToken,
                        scope: 'asd',
                        externalId: 'asd',
                        expires: '2222-01-28T14:01:21.808Z',
                    },
                },
            })
            .expect(200)).body.data;

        let d = crypto.createDecipher(conf.crypto.alg.encryption, key);
        const _accessToken = d.update(secret.value.accessToken, conf.crypto.outputEncoding, 'utf8')
            + d.final('utf8');

        d = crypto.createDecipher(conf.crypto.alg.encryption, key);
        const _refreshToken = d.update(secret.value.refreshToken, conf.crypto.outputEncoding, 'utf8')
            + d.final('utf8');

        expect(_accessToken).toEqual(accessToken);
        expect(_refreshToken).toEqual(refreshToken);
    });

    test('Decrypts secret', async () => {
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';

        const secret = (await request.post('/secrets')
            .set(...global.userToken1ExtraPerm)
            .send({
                data: {
                    name: 'secret',
                    type: OA2_AUTHORIZATION_CODE,
                    value: {
                        authClientId: authClient._id,
                        accessToken,
                        refreshToken,
                        scope: 'asd',
                        externalId: 'asd',
                        expires: '2222-12-28T14:01:21.808Z',
                    },
                },
            })
            .expect(200)).body.data;

        const decryptedSecret = (await request.get(`/secrets/${secret._id}`)
            .set(...global.userToken1ExtraPerm)
            .expect(200)).body.data;

        expect(decryptedSecret.value.accessToken).toEqual(accessToken);
        expect(decryptedSecret.value.refreshToken).not.toEqual(refreshToken);
    });
});
