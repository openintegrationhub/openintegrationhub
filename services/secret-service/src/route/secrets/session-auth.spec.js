const supertest = require('supertest');
const nock = require('nock');
const iamMock = require('../../test/iamMock');

const conf = require('../../conf');
const Server = require('../../server');
const {
    SESSION_AUTH,
} = require('../../constant').AUTH_TYPE;

let port;
let request;
let server;

describe('session auth', () => {
    beforeAll(async () => {
        port = 5114;
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        conf.crypto.isDisabled = false;
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'session-auth'),
            port,
        });
        await server.start();
        iamMock.setup();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('setup and request', async () => {
        const example = nock('https://example.com');

        // nock setup
        example
            .persist()
            .post('/auth')
            .reply(200, {
                token: 'letmein',
            });

        example
            // .persist()
            .get('/userinfo')
            .reply(200, {
                sub: 'me',
            });

        // create auth client
        const authClient = (await request.post('/auth-clients')
            .set(...global.userAuth1)
            .send({
                type: SESSION_AUTH,
                name: 'session',
                fields: [
                    {
                        key: 'username',
                        label: 'Username',
                        required: true,
                    },
                    {
                        key: 'pass',
                        label: 'Password',
                        required: true,
                    },
                    {
                        key: 'subdomain',
                        label: 'Subdomain',
                    },
                ],
                tokenPath: 'token',
                endpoints: {
                    auth: {
                        label: 'Auth Endpoint',
                        authType: 'HEADER_AUTH',
                        url: 'https://example.com/auth',
                        requestFields: [
                            {
                                key: 'user',
                                value: '{{fields.username}}',
                            },
                            {
                                key: 'password',
                                value: '{{fields.pass}}',
                            },
                        ],
                    },
                },
            })
            .expect(200)).body.data;

        // Create Session Secret
        const { _id } = (await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'example session secret',
                owners: [
                    {
                        id: '5bc75b5ff231301b6642c854',
                        type: 'USER',
                    },
                ],
                type: SESSION_AUTH,
                value: {
                    authClientId: authClient._id,
                    inputFields: {
                        username: 'user1',
                        pass: 'password1',
                    },
                },
            })
            .expect(200)).body.data;
        console.log('new secret: ', _id);
        // fetch access-token
        const { body } = await request.get(`/secrets/${_id}`)
            .set(...global.userToken1ExtraPerm) // userauth1
            .expect(200);

        expect(body.data.value.accessToken).toEqual('letmein');
    });
});
