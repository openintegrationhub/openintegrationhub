// const { fork } = require('child_process');
const supertest = require('supertest');
const nock = require('nock');
const mongoose = require('mongoose');
const base64url = require('base64url');
const qs = require('qs');
const { EventBusManager, Event } = require('@openintegrationhub/event-bus');
const iamMock = require('../../test/iamMock');
const token = require('../../test/tokens');
const AuthFlow = require('../../model/AuthFlow');
const Secret = require('../../model/Secret');
const conf = require('../../conf');
const { AUTH_TYPE, ROLE } = require('../../constant');
const Server = require('../../server');
const {
    SIMPLE, API_KEY, OA2_AUTHORIZATION_CODE, MIXED,
} = require('../../constant').AUTH_TYPE;
const { maskString } = require('../../util/common');
const dummyUsers = require('../../test/tokens');

let port;
let request;
let server;

describe('secrets', () => {
    beforeAll(async (done) => {
        port = 5111;
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'route-secrets'),
            port,
        });
        await server.start();
        iamMock.setup();
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

        // invalid: auth client not existing
        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'example microsoft oAuth2',
                    owners: [
                        {
                            id: '5bc75b5ff231301b6642c854',
                            type: 'USER',
                        },
                    ],
                    type: OA2_AUTHORIZATION_CODE,
                    value: {
                        authClientId: '5c091b70e0b1772eb68f3e4e',
                        accessToken: 'EwCIA8l6BAAURSN/FHlDW5xN74t6GzbtsBBeBUYAAROJkdD+LUXGCK8KQoDhVH8thlfggU1B116/aX81ygM6LclD3Fw+CKhQZT7jCSRMTA0BNkISBGq8gvtcq6ISTBW3lv/USBECIItwE91EK3jVaTNAqCcu4DXZJNE0iiT64qKWJlY8LBPkLdKcpZVB8VIOTMMKuwbjyYrhhj+Nb6kmhY4cC7hvFSU9f8SiIsLhPweQfCo/uLXsgLfFcv8lEXBzvQKgNUdYLAhMQylNA5sdSLd10m2pTs6c/ab2WzogV0z4A70Q/UBJjkX4JcBigJnVeEH+Tja4jwK96mo0KtZLAfI9qjEUXLCLh9oXm6ZOgzq5upY82NMDWu65s7zNHG0DZgAACNE6Ra/4URopWAJKx2DKE2/0mdEJbz5ij6BKs65ucnw2fzmdqogwODyx2dA7Gn4fBwvfZPmyCtrGj0V9oy/dRbaR39DXF3LrJVLA1sBEewEoKnp8zoS4OS2IDune6F8B8l26Ykm8dJHjLDDKecYuHGXKuwFtdex0aaTyORlUpnmgATdUCoCAOJ26G0CxvYQcgXyt1vgbD7ME2al7SAME4wiAV+q4Le/Hb3qQG968wJK2hdMJ3TrP84qJzjPEOJTR/bi3iOFYBNyTd9V+nrkNNse8zyifTbtMEq8GN9ZlRaHt432sV5v0cmGdU2ENtIPc9l80c8gk8Gw5JJFspCPugjRdBbFIQEA7eWuNxc4MruNEmzC15KVDAtfzb55xuDSxMSI+crXrrMsQM2qQbPdQcgRN/oPP21sUj3Z2a/CxdQB14Vd0jbN9wYelScW6oaKBhsuuDFhxKWFrzrN3CwXCiyI5tmFu0l34GUAsnEOATHmjLjnL2jF5rmm1cl62ZbVuGhNnZ3ONgm/L+OcCgQQJSdODqURY6zBpjgb36U7EOD0pJbhnzgm6Jt+Ck1MjsLq69oiwxyExaar2pETHGFflDxQS6BVPkxgB/DfQHb0ChIt3RumsKSVODZVxslwP2ixBBTEzfp4vVsgUlk2MshtTj+Oro5JOvmaKm6vZ0HdKPw+L3Cn8aMYqeN01tNdHjuDhhvzATDu3kScC3upPm8E35/cBWe2J4MkdN22IVIO6844huEveI6YV0ZkTOhlMr8k67ttNg7HJmEWtV9S5sewrgoFTxCNimnMtIn6R/tkKTliKELiSAg==',
                        scope: 'openid email profile https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Files.Read.All',
                        externalId: '1f348de4a17dd44b09e71142fdf57121',
                        expires: '2019-01-28T14:09:52.428Z',
                        refreshToken: 'MCd9JD0aSfwqzvhmtspstSJa7MMbT7MSLR7!dZxQm1jJLVb7UgQCMJv*aAYShdhqqNSM27Xp*o2e9t!*2YThnkjaTJa9tzY87CpsWdWtQ9d2YIQxpoHY7c6UZ8iTokUCUViogvNpPxpJYb1f60nQy6cXWRXurg9aHtRj38RDjZn*kv5spGnBVLQh2dA6ps4Uq0TtAIK5ISQ2Gdn15HDX9kjBYOiB1r*INECl5xk8qNaLi34*epNDAkDZiBSaFNoQnLLY3LYzejNgOlZyNPHu8RyVc5vP!NGVoIj9F8*QvIFgqXbZBh6!yad8SHlhpQnpVvSb*3!amZKykhrEWPgLwzrcY6n596VixI*L7RJSV*6OlvyM2AxMG0s7ZgwAYILzWc!!t7VGZhIyxUyPBseNS6yMihD4ECVKhxtN2oZGLRv9!aBQ9eewSITfXU7BMAmJF6hXpmtPYqRcuES8NXHksCeW5elfrcGC8ngvHRu49X3Y6XpoP6bZTUfP9wnd81WuEVw$$',
                    },
                },
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

        // add a mixed secret
        let mixedSecret = {
            someval: 'hello',
            nested: {
                anotherval: 'world',
            },
        };
        let resp = await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                data: {
                    name: 'string',
                    type: MIXED,
                    value: {
                        payload: JSON.stringify(mixedSecret),
                    },
                },
            })
            .expect(200);

        let mixedRespBody = await request.get(`/secrets/${resp.body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(mixedRespBody.body.data.value.payload).toEqual(maskString(JSON.stringify(mixedSecret)));

        mixedSecret = {
            someval: 'hello',
            nested: {
                anotherval: 'world',
            },
        };

        resp = await request.post('/secrets')
            .set(...global.userAuth2)
            .send({
                data: {
                    name: 'string',
                    type: MIXED,
                    value: {
                        payload: JSON.stringify(mixedSecret),
                    },
                },
            })
            .expect(200);

        mixedRespBody = await request.get(`/secrets/${resp.body.data._id}`)
            .set(...global.userAuth2)
            .expect(200);

        expect(JSON.parse(mixedRespBody.body.data.value.payload)).toEqual(mixedSecret);

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
        expect(pagination.total).toEqual(12);
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
        expect(pagination.total).toEqual(12);
        expect(pagination.perPage).toEqual(2);
        expect(pagination.totalPages).toEqual(6);

        body = (await request.get('/secrets?page[number]=10&page[size]=100')
            .set(...global.userAuth1)
            .expect(200)).body;

        secrets = body.data;
        pagination = body.meta;

        expect(secrets.length).toEqual(0);
        expect(pagination.page).toEqual(10);
        expect(pagination.total).toEqual(12);
        expect(pagination.perPage).toEqual(100);
        expect(pagination.totalPages).toEqual(1);

        body = (await request.get('/secrets?page[number]=0&page[size]=100')
            .set(...global.userAuth1)
            .expect(200)).body;

        secrets = body.data;
        pagination = body.meta;

        expect(secrets.length).toEqual(12);
        expect(pagination.page).toEqual(1);
        expect(pagination.total).toEqual(12);
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

    test('Secrets can be shared with all tenant users', async () => {
        const data = {
            name: 'sharedSecret',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
            owners: [
                {
                    id: dummyUsers.userToken1.value.tenant,
                    type: 'TENANT',
                },
            ],
        };

        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send({ data })
            .expect(200);

        const resp = (await request.get(`/secrets/${body.data._id}`)
            .set(...global.userAuth1SecondUser)
            .expect(200)).body;

        expect(resp.data.name).toEqual(data.name);

        await request.get(`/secrets/${body.data._id}`)
            .set(...global.userAuth2)
            .expect(403);
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
        await request.get(`/secrets/${new mongoose.Types.ObjectId()}`)
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

    test('Delete secret - SIMPLE', async () => {
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

    test('Delete secret via event bus', async () => {
        const userToBeDeleted = {
            id: 'DELETE_ME_876',
            type: ROLE.USER,
        };

        const data = {
            name: 'string99',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
            owners: [userToBeDeleted],
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send({ data })
            .expect(200);

        const req1 = await request.get(`/secrets/${body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(req1.body.data.owners.length).toEqual(2);

        EventBusManager.getEventBus().publish(new Event({
            headers: {
                name: 'iam.user.deleted',
            },
            payload: {
                user: userToBeDeleted.id,
            },
        }));

        const req2 = await request.get(`/secrets/${body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(req2.body.data.owners.length).toEqual(1);
        expect(req2.body.data.owners[0].id).not.toEqual(userToBeDeleted.id);
    });

    test('Add new owner to the secret', async () => {
        const data = {
            name: 'addNewOner',
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

        expect(body.data.owners.length).toEqual(1);

        const newOwner = {
            id: 'newUser',
            type: 'specialType',
        };

        const modifiedSecret = await request.post(`/secrets/${body.data._id}/owners`)
            .set(...global.userAuth1)
            .send({
                data: newOwner,
            })
            .expect(200);

        expect(modifiedSecret.body.data.owners.length).toEqual(2);
        expect(modifiedSecret.body.data.owners[1].id).toEqual(newOwner.id);
    });

    test('Remove an owner from the secret', async () => {
        const userToBeRemoved = {
            id: 'removeMeAfterwards',
            type: 'specialType',
        };

        const data = {
            name: 'removeAnOwner',
            type: SIMPLE,
            value: {
                username: 'foo',
                passphrase: 'bar',
            },
            owners: [userToBeRemoved],
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send({ data })
            .expect(200);

        expect(body.data.owners.length).toEqual(2);

        const modifiedSecret = await request.delete(`/secrets/${body.data._id}/owners?id=${userToBeRemoved.id}&type=${userToBeRemoved.type}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(modifiedSecret.body.data.owners.length).toEqual(1);
        expect(modifiedSecret.body.data.owners[0].id).toEqual(dummyUsers.userToken1.value.sub);
    });

    test('Delete secret - OAuth2', async () => {
        // create auth client
        await request.post('/auth-clients')
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
                    },
                },
            })
            .expect(200);
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
            .set(...global.userToken1ExtraPerm)
            .expect(200);

        expect(body.data.value.accessToken).toEqual('new');

        // fork test program
        // const forkedTest = fork(`${__dirname}/test/forked-test.js`, {
        //     env: {
        //         __MONGO_URI__: `${global.__MONGO_URI__}-secrets`,
        //         secretId: _id,
        //         auth: global.userToken1ExtraPerm,
        //         IAM_TOKEN: 'SecretServiceIamToken',
        //     },
        // });
        //
        // // exit test on success
        // forkedTest.on('message', (msg) => {
        //     expect(msg.failed).toEqual(0);
        //     done();
        // });

        done();
    }, 1000000);

    test('Delete secrets with service account', async () => {
        let meta = (await request.get('/secrets/')
            .set(...global.userAuth1)
            .expect(200)).body.meta;

        expect(meta.total).toBeGreaterThan(0);
        // regular user is not allowed
        await request.delete(`/secrets?${qs.stringify({
            creator: token.userToken1.value.sub,
            creatorType: token.userToken1.value.role,
        })}`)
            .set(...global.userAuth1)
            .expect(403);

        // service account has permissions
        await request.delete(`/secrets?${qs.stringify({
            userId: token.userToken1.value.sub,
            type: token.userToken1.value.role,
        })}`)
            .set(...global.serviceAccount)
            .expect(200);

        meta = (await request.get('/secrets/')
            .set(...global.userAuth1)
            .expect(200)).body.meta;

        expect(meta.total).toBe(0);
    });
});
