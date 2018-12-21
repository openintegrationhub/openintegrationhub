const getPort = require('get-port');
const { fork } = require('child_process');
const supertest = require('supertest');
const nock = require('nock');
const mongoose = require('mongoose');
const token = require('../../test/tokens');
const AuthFlow = require('../../model/AuthFlow');
const Secret = require('../../model/Secret');
const conf = require('../../conf');
const { AUTH_TYPE } = require('../../constant');
const Server = require('../../server');
const {
    SIMPLE, API_KEY, OA2_AUTHORIZATION_CODE,
} = require('../../constant').AUTH_TYPE;

let port;
let request;
let server;

describe('secrets', () => {
    beforeAll(async (done) => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-secrets`,
            port,
        });
        await server.start();
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
        done();
    });

    afterAll(async (done) => {
        await server.stop();
        done();
    });

    test('Get all secrets', async () => {
        // invalid request body
        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                value: {},
                type: 'not existing',
            })
            .expect(400);
        // add example secrets
        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: SIMPLE,
                value: {
                    username: 'foo',
                    passphrase: 'bar',
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: API_KEY,
                value: {
                    key: 'foo',
                    headerName: 'bar',
                },
            })
            .expect(200);

        const secrets = (await request.get('/secrets')
            .set(...global.userAuth1)
            .expect(200)).body;

        expect(secrets.length).toEqual(2);
        secrets.forEach((secret) => {
            expect(secret.owner[0].entityId).toEqual(token.userToken1.value.sub);
        });
    });

    test('Get the secret anonymously throws', async () => {
        const secretBody = {
            name: 'string333444',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.get(`/secrets/${body._id}`)
            .expect(401);
    });

    test('Get the secret by id', async () => {
        const secretBody = {
            name: 'string123',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        const secondResp = await request.get(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .expect(200);
        expect(secondResp.body.name).toEqual(secretBody.name);
    });

    test('Get the secret by wrong id returns 404', async () => {
        await request.get(`/secrets/${mongoose.Types.ObjectId()}`)
            .set(...global.userAuth1)
            .expect(404);
    });

    test('Replace the secret', async () => {
        const secretBody = {
            name: 'string567',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.put(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .send({ ...secretBody, name: 'newName' })
            .expect(200);

        const secondResp = await request.get(`/secrets/${body._id}`)
            .set(...global.userAuth1);
        expect(secondResp.body.name).toEqual('newName');
    });

    test('Modify the secret', async () => {
        const secretBody = {
            name: 'string567',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.patch(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .send({ name: 'newName2' })
            .expect(200);

        const secondResp = await request.get(`/secrets/${body._id}`)
            .set(...global.userAuth1);
        expect(secondResp.body.name).toEqual('newName2');
        expect(secondResp.body.type).toEqual(secretBody.type);
    });

    test('Delete secret', async () => {
        const secretBody = {
            name: 'string99',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.delete(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .expect(200);

        await request.get(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .expect(404);
    });

    test('Full flow with new client initial request, access token request and auto refresh', async (done) => {
        const scope = 'foo bar';
        const example = nock('https://example.com');


        // nock setup
        example
            .post('/auth')
            .reply(200, {
                access_token: 'old',
                expires_in: 0,
                refresh_token: 'old',
                scope,
                token_type: 'Bearer',
                id_token: 'asdsdf',
            });

        example
            .get('/userinfo')
            .reply(200, {
                sub: 'me',
                expires_in: 0,
                refresh_token: 'new',
                scope,
                token_type: 'Bearer',
                id_token: 'asdsdf',
            });


        example
            .persist()
            .post('/token')
            .reply(200, {
                access_token: 'new',
                expires_in: 0,
                refresh_token: 'new',
                scope,
                token_type: 'Bearer',
                id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            });

        // create auth client
        const { authClientId } = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: OA2_AUTHORIZATION_CODE,
                name: 'google oAuth2',
                clientId: 'clientId',
                clientSecret: 'clientSecret',
                redirectUri: `http://localhost:${conf.port}/callback`,
                endpoint: {
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
                        source: 'id_token',
                        key: 'sub',
                    },
                    scope: {
                        key: 'scope',
                    },
                },
            })
            .expect(200)).body;

        // start initial token request with oauth2 code exchange
        await request.post(`/auth-clients/${authClientId}/start-flow`)
            .set(...global.userAuth1)
            .send({
                scope,
            })
            .expect(200);

        // get authFlow id to set proper state value
        const authFlow = await AuthFlow.findOne({
            authClientId,
        });

        // simulate external api call with valid state
        await request.get(`/callback?state=${authFlow._id}&code=123456`)
            .expect(200);

        // obtain secret id

        const { _id } = await Secret[AUTH_TYPE.OA2_AUTHORIZATION_CODE].findOne({
            'value.scope': scope,
        });


        // fetch access-token
        const { body } = await request.get(`/secrets/${_id}`)
            .set(...global.userAuth1)
            .expect(200);


        expect(body.value.accessToken).toEqual('new');


        // fetch userinfo
        const resp = await request.get(`/secrets/${_id}/userinfo`)
            .set(...global.userAuth1)
            .expect(200);

        expect(resp.body.sub).toEqual('me');

        // fork test program
        const forkedTest = fork(`${__dirname}/test/forked-test.js`, {
            env: {
                __MONGO_URI__: `${global.__MONGO_URI__}-secrets`,
                secretId: _id,
                auth: global.userAuth1,
                IAM_TOKEN: 'SecretServiceIamToken',
            },
        });

        // exit test on success
        forkedTest.on('message', (msg) => {
            expect(msg.failed).toEqual(0);
            done();
        });
    }, 1000000);

    test('Get audit data for a specific secret', async () => {
        await request.get('/secrets/fofo/audit')
            .set(...global.userAuth1)
            .expect(200);
    });
});
