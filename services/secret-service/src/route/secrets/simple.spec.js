const supertest = require('supertest');
const iamMock = require('../../test/iamMock');

const conf = require('../../conf');
const Server = require('../../server');
const {
    SIMPLE,
} = require('../../constant').AUTH_TYPE;

let port;
let request;
let server;

describe('oauth', () => {
    beforeAll(async () => {
        port = 5113;
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        conf.crypto.isDisabled = false;
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'simple'),
            port,
        });
        await server.start();
        iamMock.setup();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Mixed', async () => {
        let secret = (await request.post('/secrets')
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
            .expect(200)).body.data;

        expect(secret.encryptedFields.length).not.toBe(0);
        expect(secret.value.username).not.toEqual('foo');
        secret = (await request.get(`/secrets/${secret._id}`)
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
            .expect(200)).body.data;

        expect(secret.encryptedFields.length).toBe(0);
        expect(secret.value.username).toEqual('foo');
        expect(secret.value.passphrase).not.toEqual('bar');

        secret = (await request.post('/secrets')
            .set(...global.userToken1ExtraPerm)
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
            .expect(200)).body.data;

        expect(secret.encryptedFields.length).not.toBe(0);
        expect(secret.value.username).not.toEqual('foo');
        secret = (await request.get(`/secrets/${secret._id}`)
            .set(...global.userToken1ExtraPerm)
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
            .expect(200)).body.data;

        expect(secret.encryptedFields.length).toBe(0);
        expect(secret.value.username).toEqual('foo');
        expect(secret.value.passphrase).toEqual('bar');
    });
});
