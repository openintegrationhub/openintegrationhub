const getPort = require('get-port');
const supertest = require('supertest');
const nock = require('nock');
const base64url = require('base64url');
const Secret = require('../../model/Secret');
const { AUTH_TYPE } = require('../../constant');
const AuthFlow = require('../../model/AuthFlow');
const conf = require('../../conf');
const token = require('../../test/tokens');
const Server = require('../../server');
const {
    OA2_AUTHORIZATION_CODE,
} = require('../../constant').AUTH_TYPE;

let port;
let request;
let server;

describe('callback', () => {
    beforeAll(async (done) => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-auth-clients`,
            port,
        });

        const endpointPrefix = conf.introspectEndpoint.substr(0, conf.introspectEndpoint.lastIndexOf('/'));
        const endpointSuffix = conf.introspectEndpoint.substr(conf.introspectEndpoint.lastIndexOf('/'));
        nock(endpointPrefix)
            .persist()
            .post(endpointSuffix)
            .reply((uri, requestBody, cb) => {
                const tokenName = requestBody.token;

                cb(null, [200, token[tokenName].value]);
                // ...
            });

        await server.start();
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('Run full flow', async () => {
        // // create mocked api
        const example = nock('https://example-callback.com');
        const scope = 'scope1 scope2';
        // create auth client first
        const response = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'google oAuth2',
                clientId: 'clientId',
                clientSecret: 'clientSecret',
                redirectUri: `http://localhost:${conf.port}/callback`,
                endpoint: {
                    auth: 'https://example-callback.com/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state={{state}}&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                    token: 'https://example-callback.com/exchange',
                    userinfo: 'https://example-callback.com/token',
                },
                mappings: {
                    externalId: {
                        source: 'id_token',
                        key: 'sub',
                    },
                    scope: {
                        key: 'scope',
                    },
                },
            })
            .expect(200)).body;

        await request.post(`/auth-clients/${response.authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope,
            })
            .expect(200);

        const authFlow = await AuthFlow.findOne({
            authClientId: response.authClientId,
        });

        example
            .post('/exchange')
            .reply(200, {
                access_token: 'asdasd',
                expires_in: 3600,
                refresh_token: 'asdasd',
                scope,
                token_type: 'Bearer',
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        // simulate external api call

        const state = base64url(JSON.stringify({
            flowId: authFlow._id,
            payload: {},
        }));
        await request.get(`/callback?state=${state}&code=123456`)
            .expect(200);
    });


    test('Check for externalId in id_token', async () => {
        const example = nock('https://example-callback.com');
        const scope = 'id_token';

        example
            .post('/exchange')
            .reply(200, {
                access_token: 'asdasd',
                expires_in: 3601,
                refresh_token: 'asdasd',
                scope,
                token_type: 'Bearer',
                // sub: 1234567890
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        const response = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'google oAuth2',
                clientId: 'clientId',
                clientSecret: 'clientSecret',
                redirectUri: `http://localhost:${conf.port}/callback`,
                endpoint: {
                    auth: 'https://example-callback.com/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state={{state}}&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                    token: 'https://example-callback.com/exchange',
                    userinfo: 'https://example-callback.com/token',
                },
                mappings: {
                    externalId: {
                        source: 'id_token',
                        key: 'sub',
                    },
                    scope: {
                        key: 'scope',
                    },
                },
            })
            .expect(200)).body;

        await request.post(`/auth-clients/${response.authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope,
            })
            .expect(200);

        const authFlow = await AuthFlow.findOne({
            authClientId: response.authClientId,
        });

        // simulate external api call
        const state = base64url(JSON.stringify({
            flowId: authFlow._id,
            payload: {},
        }));
        await request.get(`/callback?state=${state}&code=123456`)
            .expect(200);

        const { _id } = await Secret[AUTH_TYPE.OA2_AUTHORIZATION_CODE].findOne({
            'value.scope': scope,
        });

        const externalId = (await request.get(`/secrets/${_id}`)
            .set(...global.userAuth1)
            .expect(200)).body.value.externalId;

        expect(externalId).toEqual('1234567890');
    });

    test('Check for externalId in access_token', async () => {
        const example = nock('https://example-callback.com');
        const scope = 'access_token';

        example
            .post('/exchange')
            .reply(200, {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                expires_in: 3602,
                refresh_token: 'asdasd',
                scope,
                token_type: 'Bearer',
                // sub: 1234567890
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        const response = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'google oAuth2',
                clientId: 'clientId',
                clientSecret: 'clientSecret',
                redirectUri: `http://localhost:${conf.port}/callback`,
                endpoint: {
                    auth: 'https://example-callback.com/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state={{state}}&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                    token: 'https://example-callback.com/exchange',
                    userinfo: 'https://example-callback.com/token',
                },
                mappings: {
                    externalId: {
                        source: 'access_token',
                        key: 'sub',
                    },
                    scope: {
                        key: 'scope',
                    },
                },
            })
            .expect(200)).body;

        await request.post(`/auth-clients/${response.authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope,
            })
            .expect(200);

        const authFlow = await AuthFlow.findOne({
            authClientId: response.authClientId,
        });

        // simulate external api call
        const state = base64url(JSON.stringify({
            flowId: authFlow._id,
            payload: {},
        }));
        await request.get(`/callback?state=${state}&code=123456`)
            .expect(200);

        const { _id } = await Secret[AUTH_TYPE.OA2_AUTHORIZATION_CODE].findOne({
            'value.scope': scope,
        });

        const externalId = (await request.get(`/secrets/${_id}`)
            .set(...global.userAuth1)
            .expect(200)).body.value.externalId;

        expect(externalId).toEqual('1234567890');
    });

    test('Check for externalId in userinfo', async () => {
        const example = nock('https://example-callback.com');
        const scope = 'userinfo';

        example
            .post('/exchange')
            .reply(200, {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                expires_in: 3603,
                refresh_token: 'asdasd',
                scope,
                token_type: 'Bearer',
                // sub: 1234567890
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        example
            .get('/userinfo')
            .reply(200, {
                sub: '1234567890',
                token_type: 'Bearer',
            });

        const response = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'google oAuth222222',
                clientId: 'clientId',
                clientSecret: 'clientSecret',
                redirectUri: `http://localhost:${conf.port}/callback`,
                endpoint: {
                    auth: 'https://example-callback.com/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state={{state}}&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                    token: 'https://example-callback.com/exchange',
                    userinfo: 'https://example-callback.com/userinfo',
                },
                mappings: {
                    externalId: {
                        source: 'userinfo',
                        key: 'sub',
                    },
                    scope: {
                        key: 'scope',
                    },
                },
            })
            .expect(200)).body;

        await request.post(`/auth-clients/${response.authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope,
            })
            .expect(200);

        let authFlow = await AuthFlow.findOne({
            authClientId: response.authClientId,
        });

        // simulate external api call
        let state = base64url(JSON.stringify({
            flowId: authFlow._id,
            payload: {},
        }));
        await request.get(`/callback?state=${state}&code=123456`)
            .expect(200);

        const { _id } = await Secret[AUTH_TYPE.OA2_AUTHORIZATION_CODE].findOne({
            'value.scope': scope,
        });

        let secret = (await request.get(`/secrets/${_id}`)
            .set(...global.userAuth1)
            .expect(200)).body;

        const { externalId } = secret.value;
        const expires1 = secret.value.expires;
        expect(externalId).toEqual('1234567890');

        // update secret to change scope
        await request.post(`/auth-clients/${response.authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope: 'new scope',
            })
            .expect(200);

        authFlow = await AuthFlow.findOne({
            authClientId: response.authClientId,
        });

        example
            .post('/exchange')
            .reply(200, {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                expires_in: 3605,
                refresh_token: 'asdasd',
                scope: 'new scope',
                token_type: 'Bearer',
                // sub: 1234567890
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        example
            .get('/userinfo')
            .reply(200, {
                sub: '1234567890',
            });

        // simulate external api call
        state = base64url(JSON.stringify({
            flowId: authFlow._id,
            payload: {},
        }));
        await request.get(`/callback?state=${state}&code=123456`)
            .expect(200);

        example
            .post('/exchange')
            .reply(200, {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                expires_in: 3606,
                refresh_token: 'asdasd',
                scope: 'new scope',
                token_type: 'Bearer',
                // sub: 1234567890
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        secret = (await request.get(`/secrets/${_id}`)
            .set(...global.userAuth1)
            .expect(200)).body;

        const newScope = secret.value.scope;
        const expires2 = secret.value.expires;

        expect(newScope).toEqual('new scope');
        expect(expires2).not.toEqual(expires1);
    });
});
