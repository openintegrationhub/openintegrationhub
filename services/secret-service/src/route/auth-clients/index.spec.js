const getPort = require('get-port');
const supertest = require('supertest');
const nock = require('nock');
const conf = require('../../conf');
const Server = require('../../server');
const token = require('../../test/tokens');
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

    test('Create clients', async () => {
        await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: OA1_TWO_LEGGED,
                consumerKey: 'string',
                consumerSecret: 'string',
                nonce: 'string',
                signature: 'string',
                signatureMethod: 'string',
                version: 'string',
            })
            .expect(200);

        await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'oAuth2',
                clientId: 'string',
                clientSecret: 'string',
                redirectUri: '/dev/null',
                endpoint: {
                    auth: 'http://',
                    token: 'http://',
                    userinfo: 'http://',
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
        const { authClientId } = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'oAuth2',
                clientId: 'string',
                clientSecret: 'string',
                redirectUri: '/dev/null',
                endpoint: {
                    auth: 'http://',
                    token: 'http://',
                    userinfo: 'http://',
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
        const authClient = (await request.get(`/auth-clients/${authClientId}`)
            .set(...global.userAuth1)
            .expect(200)).body;

        expect(authClient._id).toEqual(authClientId);
    });

    test('Modify a platform oauth secret', async () => {
        const authClientBody = {
            type: OA2_AUTHORIZATION_CODE,
            name: 'oAuth2',
            clientId: 'string',
            clientSecret: 'string',
            redirectUri: '/dev/null',
            endpoint: {
                auth: 'http://',
                token: 'http://',
                userinfo: 'http://',
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
        };

        const { authClientId } = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send(authClientBody)
            .expect(200)).body;

        await request.patch(`/auth-clients/${authClientId}`)
            .set(...global.userAuth1)
            .send({
                ...authClientBody,
                name: 'test',
            })
            .expect(200);

        const authClient = (await request.get(`/auth-clients/${authClientId}`)
            .set(...global.userAuth1)
            .expect(200)).body;

        expect(authClient.name).toEqual('test');
    });

    test('Remove a platform oauth secret', async () => {
        const { authClientId } = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'oAuth2',
                clientId: 'string',
                clientSecret: 'string',
                redirectUri: '/dev/null',
                endpoint: {
                    auth: 'http://',
                    token: 'http://',
                    userinfo: 'http://',
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

        await request.delete(`/auth-clients/${authClientId}`)
            .set(...global.userAuth1)
            .expect(200);
    });

    test('Start oauth2 authorization code flow', async () => {
        const scope = 'scope1 scope2';
        // create auth client first
        const { authClientId } = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'google oAuth2',
                clientId: 'clientId',
                clientSecret: 'clientSecret',
                redirectUri: `http://localhost:${conf.port}/callback`,
                endpoint: {
                    auth: 'https://accounts.google.com/o/oauth2/v2/auth?'
                            + 'scope={{scope}}&'
                            + 'access_type=offline&'
                            + 'include_granted_scopes=true&'
                            + 'state={{state}}&'
                            + 'redirect_uri={{redirectUri}}&'
                            + 'response_type=code&'
                            + 'client_id={{clientId}}',
                    token: 'https://www.googleapis.com/oauth2/v4/token',
                    userinfo: 'https://www.googleapis.com/oauth2/v4/token',
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

        const { body } = await request.post(`/auth-clients/${authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope,
            })
            .expect(200);

        expect(body.authUrl).not.toMatch('undefined');
    });
});
