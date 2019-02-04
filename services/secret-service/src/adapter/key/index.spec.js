const getPort = require('get-port');
const supertest = require('supertest');
const nock = require('nock');
const crypto = require('crypto');
const token = require('../../test/tokens');
const conf = require('../../conf');
const Server = require('../../server');

let port;
let request;
let server;

describe('key adapter', () => {
    beforeAll(async (done) => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        conf.crypto.isDisabled = false;
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-getKey`,
            port,
        });
        await server.start();
        const iamEndpointPrefix = conf.iam.introspectEndpoint.substr(0, conf.iam.introspectEndpoint.lastIndexOf('/'));
        const iamEndpointSuffix = conf.iam.introspectEndpoint.substr(conf.iam.introspectEndpoint.lastIndexOf('/'));
        nock(iamEndpointPrefix)
            .persist()
            .post(iamEndpointSuffix)
            .reply((uri, requestBody, cb) => {
                const tokenName = requestBody.token;
                cb(null, [200, token[tokenName].value]);
            });
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('Encrypts secret with key', async () => {
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';

        nock('https://accounts.basaas.com')
            .get('/api/v1/tenants/5c507eb60838f1f976e5f2a4/key')
            .reply((uri, requestBody, cb) => {
                cb(null, [200, key]);
            });

        const secret = (await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'secret',
                    type: 'OA2_AUTHORIZATION_CODE',
                    value: {
                        authClientId: '5c0a4f796731613b7d10e73e',
                        accessToken,
                        refreshToken,
                        scope: 'asd',
                        externalId: 'asd',
                        expires: '2019-01-28T14:01:21.808Z',
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
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';

        nock('https://accounts.basaas.com')
            .persist()
            .get('/api/v1/tenants/5c507eb60838f1f976e5f2a4/key')
            .reply((uri, requestBody, cb) => {
                cb(null, [200, key]);
            });

        const secret = (await request.post('/secrets')
            .set(...global.userToken1ExtraPerm)
            .send({
                data: {
                    name: 'secret',
                    type: 'OA2_AUTHORIZATION_CODE',
                    value: {
                        authClientId: '5c0a4f796731613b7d10e73e',
                        accessToken,
                        refreshToken,
                        scope: 'asd',
                        externalId: 'asd',
                        expires: '2019-12-28T14:01:21.808Z',
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
