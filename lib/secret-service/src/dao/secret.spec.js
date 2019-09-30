const getPort = require('get-port');
const { ENCRYPT, DECRYPT } = require('../constant').CRYPTO.METHODS;
const { SIMPLE, OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;
const AuthClientDAO = require('./auth-client');
const SecretDAO = require('./secret');
const Server = require('../server');
const conf = require('../conf');

let port;
let server;
let authClient;


describe('SecretDAO', () => {
    beforeAll(async () => {
        conf.crypto.isDisabled = false;
        port = await getPort();
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}-secret-dao`,
            port,
        });
        await server.start();

        const data = {
            type: OA2_AUTHORIZATION_CODE,
            name: 'oAuth2',
            clientId: 'string',
            clientSecret: 'string',
            redirectUri: '/dev/null',
            endpoints: {
                auth: 'http://',
                token: 'http://',
                userinfo: 'http://',
            },
            mappings: {
                externalId: {
                    source: 'id_token',
                    key: 'sub',
                },
            },
        };

        authClient = await AuthClientDAO.create(data);
    });

    afterAll(async () => {
        await server.stop();
    });

    test('create generates encrypted secret', async () => {
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';

        const secret = await SecretDAO.create({
            name: 'secret',
            type: OA2_AUTHORIZATION_CODE,
            value: {
                authClientId: authClient._id,
                accessToken,
                refreshToken,
                scope: 'asd',
                externalId: 'asd',
                expires: '2019-01-28T14:01:21.808Z',
            },
        }, key);

        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.refreshToken).not.toEqual(refreshToken);
    });

    test('update modifies encrypted secret', async () => {
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';
        const newName = 'new name';
        const newAccessToken = 'new access token';
        const newRefreshToken = 'new refresh token';

        let secret = await SecretDAO.create({
            name: 'secret',
            type: OA2_AUTHORIZATION_CODE,
            value: {
                authClientId: authClient._id,
                accessToken,
                refreshToken,
                scope: 'asd',
                externalId: 'asd',
                expires: '2019-01-28T14:01:21.808Z',
            },
        }, key);

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);

        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        secret = await SecretDAO.update({
            id: secret._id,
            data: {
                name: newName,
                value: {
                    accessToken: newAccessToken,
                    expires: 'new',
                },
            },
        }, key);

        expect(secret.value.accessToken).not.toEqual(newAccessToken);
        expect(secret.value.refreshToken).not.toEqual(refreshToken);

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);

        expect(secret.value.accessToken).toEqual(newAccessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        secret = await SecretDAO.update({
            id: secret._id,
            data: {
                value: {
                    refreshToken: newRefreshToken,
                },
            },
        }, key);

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);

        expect(secret.value.accessToken).toEqual(newAccessToken);
        expect(secret.value.refreshToken).toEqual(newRefreshToken);
    });

    test('cryptoSecret OA2', async () => {
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';

        // full encryption
        let secret = SecretDAO.cryptoSecret({
            name: 'secret',
            type: OA2_AUTHORIZATION_CODE,
            value: {
                authClientId: '5c0a4f796731613b7d10e73e',
                accessToken,
                refreshToken,
                scope: 'asd',
                externalId: 'asd',
                expires: '2019-01-28T14:01:21.808Z',
            },
            encryptedFields: [],
        }, key, ENCRYPT);

        expect(secret.encryptedFields).toContain('accessToken');
        expect(secret.encryptedFields).toContain('refreshToken');
        expect(secret.encryptedFields).toHaveLength(2);

        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.refreshToken).not.toEqual(refreshToken);

        // full decryption

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).not.toContain('accessToken');
        expect(secret.encryptedFields).not.toContain('refreshToken');
        expect(secret.encryptedFields).toHaveLength(0);

        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        // encrypt one field
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT, ['accessToken']);
        expect(secret.encryptedFields).toContain('accessToken');
        expect(secret.encryptedFields).not.toContain('refreshToken');
        expect(secret.encryptedFields).toHaveLength(1);

        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        // decrypt one field
        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT, ['accessToken']);
        expect(secret.encryptedFields).not.toContain('accessToken');
        expect(secret.encryptedFields).not.toContain('refreshToken');
        expect(secret.encryptedFields).toHaveLength(0);

        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        // try to encrypt non existing field
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT, ['fooo']);
        expect(secret.encryptedFields).toHaveLength(0);

        // try to decrypt non existing field
        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT, ['fooo']);
        expect(secret.encryptedFields).toHaveLength(0);

        // try to decrypt any non encrypted fields
        expect(() => SecretDAO.cryptoSecret(secret, key, DECRYPT)).toThrowError('wrong final block length');

        // try to encrypt already encrypted
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT);
        expect(() => SecretDAO.cryptoSecret(secret, key, ENCRYPT)).toThrowError('already encrypted');

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);

        // try to encrypt already encrypted field
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT, ['refreshToken']);
        expect(() => SecretDAO.cryptoSecret(secret, key, ENCRYPT)).toThrowError('Field refreshToken already encrypted');

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).toHaveLength(0);
    });

    test('cryptoSecret SIMPLE', async () => {
        const key = 'sshhhh';
        const username = 'foo';
        const passphrase = 'bar';

        // full encryption
        let secret = SecretDAO.cryptoSecret({
            name: 'secret',
            type: SIMPLE,
            value: {
                username,
                passphrase,
            },
            encryptedFields: [],
        }, key, ENCRYPT, []);

        expect(secret.encryptedFields).toContain('username');
        expect(secret.encryptedFields).toContain('passphrase');
        expect(secret.encryptedFields).toHaveLength(2);

        expect(secret.value.username).not.toEqual(username);
        expect(secret.value.passphrase).not.toEqual(passphrase);

        // full decryption

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).not.toContain('username');
        expect(secret.encryptedFields).not.toContain('passphrase');
        expect(secret.encryptedFields).toHaveLength(0);

        expect(secret.value.username).toEqual(username);
        expect(secret.value.passphrase).toEqual(passphrase);
    });
});
