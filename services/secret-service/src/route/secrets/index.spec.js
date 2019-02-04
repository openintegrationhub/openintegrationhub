const getPort = require('get-port');
const { fork } = require('child_process');
const supertest = require('supertest');
const nock = require('nock');
const mongoose = require('mongoose');
const base64url = require('base64url');
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
        const iamEndpointPrefix = conf.iam.introspectEndpoint.substr(0, conf.iam.introspectEndpoint.lastIndexOf('/'));
        const iamEndpointSuffix = conf.iam.introspectEndpoint.substr(conf.iam.introspectEndpoint.lastIndexOf('/'));
        nock(iamEndpointPrefix)
            .persist()
            .post(iamEndpointSuffix)
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
        // call without having secrets
        let body = (await request.get('/secrets')
            .set(...global.userAuth1)
            .expect(200)).body;

        let secrets = body.data;
        let pagination = body.meta;

        expect(secrets.length).toEqual(0);

        expect(pagination.page).toEqual(1);
        expect(pagination.total).toEqual(0);
        expect(pagination.perPage).toEqual(conf.pagination.pageSize);
        expect(pagination.totalPages).toEqual(1);

        // invalid request body
        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    value: {},
                    type: 'not existing',
                },
            })
            .expect(400);
        // add example secrets
        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: SIMPLE,
                    value: {
                        username: 'foo',
                        passphrase: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: SIMPLE,
                    value: {
                        username: 'foo',
                        passphrase: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: API_KEY,
                    value: {
                        key: 'foo',
                        headerName: 'bar',
                    },
                },
            })
            .expect(200);

        body = (await request.get('/secrets')
            .set(...global.userAuth1)
            .expect(200)).body;

        secrets = body.data;
        pagination = body.meta;

        expect(secrets.length).toEqual(10);

        expect(pagination.page).toEqual(1);
        expect(pagination.total).toEqual(11);
        expect(pagination.perPage).toEqual(conf.pagination.pageSize);
        expect(pagination.totalPages).toEqual(2);

        secrets.forEach((secret) => {
            expect(secret.owners[0].id).toEqual(token.userToken1.value.sub);
        });

        body = (await request.get('/secrets?page[number]=2&page[size]=2')
            .set(...global.userAuth1)
            .expect(200)).body;

        secrets = body.data;
        pagination = body.meta;

        expect(secrets.length).toEqual(2);
        expect(pagination.page).toEqual(2);
        expect(pagination.total).toEqual(11);
        expect(pagination.perPage).toEqual(2);
        expect(pagination.totalPages).toEqual(6);

        body = (await request.get('/secrets?page[number]=10&page[size]=100')
            .set(...global.userAuth1)
            .expect(200)).body;

        secrets = body.data;
        pagination = body.meta;

        expect(secrets.length).toEqual(0);
        expect(pagination.page).toEqual(10);
        expect(pagination.total).toEqual(11);
        expect(pagination.perPage).toEqual(100);
        expect(pagination.totalPages).toEqual(1);

        body = (await request.get('/secrets?page[number]=0&page[size]=100')
            .set(...global.userAuth1)
            .expect(200)).body;

        secrets = body.data;
        pagination = body.meta;

        expect(secrets.length).toEqual(11);
        expect(pagination.page).toEqual(1);
        expect(pagination.total).toEqual(11);
        expect(pagination.perPage).toEqual(100);
        expect(pagination.totalPages).toEqual(1);
    });

    test('Get the secret anonymously throws', async () => {
        const data = {
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
            .send({ data })
            .expect(200);

        await request.get(`/secrets/${body.data._id}`)
            .expect(401);
    });

    test('Get the secret by id', async () => {
        const data = {
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
            .send({ data })
            .expect(200);

        const secondResp = await request.get(`/secrets/${body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);
        expect(secondResp.body.data.name).toEqual(data.name);
    });

    test('Raw secret only returned if authorized', async () => {
        const data = {
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
            .send({ data })
            .expect(200);

        const secondResp = await request.get(`/secrets/${body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);
        expect(secondResp.body.data.name).toEqual(data.name);
        expect(secondResp.body.data.value.passphrase).toEqual('***');

        const extraPermResp = await request.get(`/secrets/${body.data._id}`)
            .set(...global.userToken1ExtraPerm)
            .expect(200);
        expect(extraPermResp.body.data.name).toEqual(data.name);
        expect(extraPermResp.body.data.value.passphrase).toEqual(data.value.passphrase);
    });

    test('Get the secret by wrong id returns 404', async () => {
        await request.get(`/secrets/${mongoose.Types.ObjectId()}`)
            .set(...global.userAuth1)
            .expect(404);
    });

    test('Modify the secret', async () => {
        const data = {
            name: 'string567',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const secret = (await request.post('/secrets')
            .set(...global.userAuth1)
            .send({ data })
            .expect(200)).body.data;

        let updatedSecret = (await request.patch(`/secrets/${secret._id}`)
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'newName2',
                },
            })
            .expect(200)).body.data;

        expect(updatedSecret.name).toEqual('newName2');
        expect(updatedSecret._id).toEqual(secret._id);

        updatedSecret = (await request.patch(`/secrets/${secret._id}`)
            .set(...global.userToken1ExtraPerm)
            .send({
                data: {
                    name: 'second',
                    value: {
                        username: 'foo',
                        passphrase: 'bar',
                    },
                },
            })
            .expect(200)).body.data;

        expect(updatedSecret.name).toEqual('second');
        expect(updatedSecret.value.username).toEqual('foo');
        expect(updatedSecret.value.passphrase).toEqual('bar');
    });

    test('Delete secret', async () => {
        const data = {
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
            .send({ data })
            .expect(200);

        await request.delete(`/secrets/${body.data._id}`)
            .set(...global.userAuth1)
            .expect(204);

        await request.get(`/secrets/${body.data._id}`)
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
                            source: 'id_token',
                            key: 'sub',
                        },
                        scope: {
                            key: 'scope',
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
        await request.get(`/callback?state=${state}&code=123456`)
            .expect(200);

        // obtain secret id

        const { _id } = await Secret[AUTH_TYPE.OA2_AUTHORIZATION_CODE].findOne({
            'value.scope': scope,
        });


        // fetch access-token
        const { body } = await request.get(`/secrets/${_id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(body.data.value.accessToken).toEqual('new');

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
});
