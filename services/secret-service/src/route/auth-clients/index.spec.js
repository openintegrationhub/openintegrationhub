const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');
const {
    OA1_TWO_LEGGED, OA2_AUTHORIZATION_CODE,
} = require('../../constant').AUTH_TYPE;

let port;
let request;
let server;

describe('auth-clients', () => {
    beforeAll(async (done) => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-auth-client`,
            port,
        });
        await server.start();
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('Create clients', async () => {
        await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: OA1_TWO_LEGGED,
                property: {
                    consumerKey: 'string',
                    consumerSecret: 'string',
                    nonce: 'string',
                    signature: 'string',
                    signatureMethod: 'string',
                    version: 'string',
                },
            })
            .expect(200);

        await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'oAuth2',
                property: {
                    clientId: 'string',
                    clientSecret: 'string',
                    redirectUri: '/dev/null',
                    endpoint: {
                        start: 'http://',
                        exchange: 'http://',
                        refresh: 'http://',
                    },
                },
            })
            .expect(200);

        await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                name: 'oAuth2',
                clientId: 'string',
                clientSecret: 'string',
                refreshTokenUrl: 'string',
                type: 'foo',
            })
            .expect(400);
    });

    test('Retrieve all clients created by the current user.', async () => {
        const { body } = await request.get('/auth-clients')
            .set(...global.userAuth1)
            .expect(200);

        expect(body.length).toBe(2);
    });

    test('Get auth client by id', async () => {
        await request.get('/auth-clients/fofo')
            .set(...global.userAuth1)
            .expect(401);
    });

    test('Modify a platform oauth secret', async () => {
        await request.patch('/auth-clients/fofo')
            .set(...global.userAuth1)
            .expect(401);
    });

    test('Start oauth2 authorization code flow', async () => {
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
                        start: 'https://accounts.google.com/o/oauth2/v2/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state=state_parameter_passthrough_value&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                        exchange: 'https://www.googleapis.com/oauth2/v4/token',
                        refresh: 'https://www.googleapis.com/oauth2/v4/token',
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
    });
});
