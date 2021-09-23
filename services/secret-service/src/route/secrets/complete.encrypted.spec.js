const supertest = require('supertest');
const nock = require('nock');
const base64url = require('base64url');
const iamMock = require('../../test/iamMock');

const Secret = require('../../model/Secret');
const AuthFlow = require('../../model/AuthFlow');
const conf = require('../../conf');
const Server = require('../../server');
const {
    OA2_AUTHORIZATION_CODE,
} = require('../../constant').AUTH_TYPE;

let port;
let request;
let server;

describe('key adapter', () => {
    beforeAll(async () => {
        conf.crypto.isDisabled = false;
        port = 5109;
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        conf.crypto.isDisabled = false;
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'complete'),
            port,
        });
        await server.start();
        iamMock.setup();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Complete flow with encrypted secrets and refresh', async () => {
        const scope = 'foo bar';
        const key = 'shhhhhh';
        const refreshToken = 'my refresh token';

        const example = nock('https://example.com');

        // create auth client
        const authClient = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                data: {
                    type: OA2_AUTHORIZATION_CODE,
                    name: 'google oAuth2',
                    clientId: 'clientId',
                    clientSecret: 'clientSecret',
                    redirectUri: `http://localhost:${conf.port}/callback`,
                    endpoints: {
                        auth: 'https://example.com/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state={{state}}&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                        token: 'https://example.com/token',
                        userinfo: 'https://example.com/userinfo',
                    },
                    mappings: {
                        externalId: {
                            source: 'token_response',
                            key: 'sub',
                        },
                    },
                },
            })
            .expect(200)).body.data;

        // start initial token request with oauth2 code exchange
        await request.post(`/auth-clients/${authClient._id}/start-flow`)
            .set(...global.userAuth1)
            .send({
                data: {
                    scope,
                },
            })
            .expect(200);

        // get authFlow id to set proper state value
        const authFlow = await AuthFlow.findOne({
            authClientId: authClient._id,
        });

        // simulate external api call with valid state
        const state = base64url(JSON.stringify({
            flowId: authFlow._id,
            payload: {},
        }));

        example
            .post('/token')
            .reply(200, {
                access_token: 'old',
                expires_in: 0,
                refresh_token: refreshToken,
                scope,
                token_type: 'Bearer',
                id_token: 'asdsdf',
                sub: 'foo',
            });

        await request.get(`/callback?state=${state}&code=123456`)
            .expect(200);

        // obtain secret id

        const { _id } = await Secret[OA2_AUTHORIZATION_CODE].findOne({
            'value.scope': scope,
        });

        const newAccessToken = 'my new access token';
        example
            .post('/token')
            .reply(200, {
                access_token: newAccessToken,
                sub: 'foo',
                expires_in: 0,
                scope,
                token_type: 'Bearer',
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        // fetch access-token
        const { body } = await request.get(`/secrets/${_id}`)
            .set(...global.userToken1ExtraPerm)
            .expect(200);

        expect(body.data.value.accessToken).toEqual(newAccessToken);
        expect(body.data.value.refreshToken).toEqual(refreshToken);

        const secret = await Secret.full.findById(_id);
        expect(secret.value.accessToken).not.toEqual(newAccessToken);
        expect(secret.value.refreshToken).not.toEqual(refreshToken);
        expect(secret.encryptedFields).toHaveLength(2);
    });
});
