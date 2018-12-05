const getPort = require('get-port');
const supertest = require('supertest');
const nock = require('nock');
const AuthFlow = require('../../model/AuthFlow');
const conf = require('../../conf');
const Server = require('../../server');
const {
    OA2_AUTHORIZATION_CODE,
} = require('../../constant').AUTH_TYPE;

let port;
let request;
let server;

describe('auth-clients', () => {
    beforeAll(async (done) => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-auth-clients`,
            port,
        });
        await server.start();
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('Run full flow', async () => {
        const scope = 'scope1 scope2';
        // create auth client first
        const { authClientId } = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'google oAuth2',
                property: {
                    clientId: process.env.CLIENT_ID,
                    clientSecret: process.env.CLIENT_SECRET,
                    redirectUri: `http://localhost:${conf.port}/callback`,
                    endpoint: {
                        start: 'https://example.com/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state=state_parameter_passthrough_value&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                        exchange: 'https://example.com/exchange',
                        refresh: 'https://example.com/token',
                    },
                },
            })
            .expect(200)).body;

        await request.post(`/auth-clients/${authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope,
            })
            .expect(200);

        const authFlow = await AuthFlow.findOne({
            authClientId,
        });

        // // create mocked api
        nock('https://example.com')
            .post('/exchange')
            .reply(200, {
                access_token: 'asdasd',
                expires_in: 3600,
                refresh_token: 'asdasd',
                scope: 'https://www.googleapis.com/auth/userinfo.profile',
                token_type: 'Bearer',
                id_token: 'asdsdf',
            });

        // simulate external api call
        await request.get(`/callback?state=${authFlow._id}&code=123456`)
            .expect(200);
    });
});
