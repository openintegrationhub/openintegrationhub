// const ValidationError = require('mongoose/lib/error/validation');
const { ENCRYPT, DECRYPT } = require('../constant').CRYPTO.METHODS;
const {
    SIMPLE, OA2_AUTHORIZATION_CODE, MIXED, SESSION_AUTH,
} = require('../constant').AUTH_TYPE;

const {
    ENTITY_TYPE,
} = require('../constant');
const AuthClientDAO = require('./auth-client');
const SecretDAO = require('./secret');
const Server = require('../server');
const conf = require('../conf');
const tokens = require('../test/tokens');

let port;
let server;
let authClient;

describe('SecretDAO', () => {
    beforeAll(async () => {
        conf.crypto.isDisabled = false;
        port = 5103;
        server = new Server({
            mongoDbConnection: global.__MONGO_URI__.replace('changeme', 'secret-dao'),
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

        // // try to decrypt any non encrypted fields
        // expect(() => SecretDAO.cryptoSecret(secret, key, DECRYPT)).toThrowError('wrong final block length');

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

    test('cryptoSecret SESSION', async () => {
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const input = {
            username: 'user',
            password: 'pass',
        };

        // full encryption
        let secret = SecretDAO.cryptoSecret({
            name: 'secret',
            type: SESSION_AUTH,
            value: {
                authClientId: '5c0a4f796731613b7d10e73e',
                accessToken,
                inputFields: input,
            },
            encryptedFields: [],
        }, key, ENCRYPT);

        expect(secret.encryptedFields).toEqual(expect.arrayContaining(['accessToken', 'inputFields']));
        expect(secret.encryptedFields).toHaveLength(2);

        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.inputFields).not.toEqual(expect.any(Object));

        // full decryption

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).not.toContain('accessToken');
        expect(secret.encryptedFields).not.toContain('inputFields');
        expect(secret.encryptedFields).toHaveLength(0);

        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.inputFields).toMatchObject(input);

        // encrypt one field
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT, ['accessToken']);
        expect(secret.encryptedFields).toContain('accessToken');
        expect(secret.encryptedFields).not.toContain('inputFields');
        expect(secret.encryptedFields).toHaveLength(1);

        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.inputFields).toMatchObject(input);

        // decrypt one field
        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT, ['accessToken']);
        expect(secret.encryptedFields).not.toContain('accessToken');
        expect(secret.encryptedFields).not.toContain('inputFields');
        expect(secret.encryptedFields).toHaveLength(0);

        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.inputFields).toMatchObject(input);

        // try to encrypt non existing field
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT, ['fooo']);
        expect(secret.encryptedFields).toHaveLength(0);

        // try to decrypt non existing field
        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT, ['fooo']);
        expect(secret.encryptedFields).toHaveLength(0);

        // // try to decrypt any non encrypted fields
        // expect(() => SecretDAO.cryptoSecret(secret, key, DECRYPT)).toThrowError('wrong final block length');

        // try to encrypt already encrypted
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT);
        expect(() => SecretDAO.cryptoSecret(secret, key, ENCRYPT)).toThrowError('already encrypted');

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);

        // try to encrypt already encrypted field
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT, ['accessToken']);
        expect(() => SecretDAO.cryptoSecret(secret, key, ENCRYPT)).toThrowError('Field accessToken already encrypted');

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

    test('cryptoSecret MIXED', async () => {
        const key = 'sshhhh';
        const mixedSecret = {
            someval: 'hello',
            nested: {
                anotherval: 'world',
            },
        };

        // full encryption
        let secret = SecretDAO.cryptoSecret({
            name: 'secret',
            type: MIXED,
            value: {
                payload: JSON.stringify(mixedSecret),
            },
            encryptedFields: [],
        }, key, ENCRYPT, []);

        expect(secret.encryptedFields).toContain('payload');
        expect(secret.encryptedFields).toHaveLength(1);

        expect(secret.value.payload).not.toEqual(mixedSecret);
        expect(secret.name).toEqual('secret');

        // full decryption

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(JSON.parse(secret.value.payload)).toEqual(mixedSecret);
        expect(secret.name).toEqual('secret');
    });

    test('Switch crypto.isDisabled', async () => {
        conf.crypto.isDisabled = true;
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';

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

        expect(secret.encryptedFields).toHaveLength(0);
        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        conf.crypto.isDisabled = false;

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).toHaveLength(0);
        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT);
        expect(secret.encryptedFields).toHaveLength(2);
        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.refreshToken).not.toEqual(refreshToken);

        conf.crypto.isDisabled = true;
        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT);
        expect(secret.encryptedFields).toHaveLength(2);
        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.refreshToken).not.toEqual(refreshToken);

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).toHaveLength(0);
        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT);
        expect(secret.encryptedFields).toHaveLength(0);
        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT);
        expect(secret.encryptedFields).toHaveLength(0);
        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        conf.crypto.isDisabled = false;

        secret = SecretDAO.cryptoSecret(secret, key, ENCRYPT);
        expect(secret.encryptedFields).toHaveLength(2);
        expect(secret.value.accessToken).not.toEqual(accessToken);
        expect(secret.value.refreshToken).not.toEqual(refreshToken);

        expect(() => SecretDAO.cryptoSecret(secret, key, ENCRYPT)).toThrow(Error);

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).toHaveLength(0);
        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);

        secret = SecretDAO.cryptoSecret(secret, key, DECRYPT);
        expect(secret.encryptedFields).toHaveLength(0);
        expect(secret.value.accessToken).toEqual(accessToken);
        expect(secret.value.refreshToken).toEqual(refreshToken);
    });

    test('Discriminator validation', async () => {
        const key = 'sshhhh';
        const mixedSecret = {
            someval: 'hello',
            nested: {
                anotherval: 'world',
            },
        };

        await expect(
            SecretDAO.create({
                type: MIXED,
                name: 'foo',
                value: {
                    payload: mixedSecret,
                },
            }, key),
        ).rejects.toThrow();

        await expect(
            SecretDAO.create({
                type: MIXED,
                name: 'foo',
                value: {
                    payload: JSON.stringify(mixedSecret),
                },
            }, key),
        ).resolves.not.toThrow();
    });

    test('findByAuthClientId with ownerId', async () => {
        const key = 'sshhhh';
        const accessToken = 'my access_token';
        const refreshToken = 'my refresh_token';
        const secretData = {
            name: 'secret',
            type: OA2_AUTHORIZATION_CODE,
            owners: [
                {
                    id: tokens.userToken1.value.sub,
                    type: ENTITY_TYPE.USER,
                },
                {
                    id: tokens.userToken1.value.tenant,
                    type: ENTITY_TYPE.TENANT,
                },
            ],
            value: {
                authClientId: authClient._id,
                accessToken,
                refreshToken,
                scope: 'asd',
                externalId: 'asd',
                expires: '2019-01-28T14:01:21.808Z',
            },
        };

        await SecretDAO.create({
            ...secretData,
            name: 'secret1',
        }, key);

        await SecretDAO.create({
            ...secretData,
            name: 'secret2',
        }, key);

        await SecretDAO.create({
            ...secretData,
            name: 'secret3',
            owners: [
                {
                    id: tokens.userToken2.value.sub,
                    type: ENTITY_TYPE.USER,
                },
                {
                    id: tokens.userToken2.value.tenant,
                    type: ENTITY_TYPE.TENANT,
                },
            ],
        }, key);

        let secrets = await SecretDAO.findByAuthClient(tokens.userToken1.value.sub, authClient._id);
        expect(secrets.length).toEqual(2);

        secrets = await SecretDAO.findByAuthClient(tokens.userToken1.value.tenant, authClient._id);
        expect(secrets.length).toEqual(2);

        secrets = await SecretDAO.findByAuthClient(tokens.userToken2.value.sub, authClient._id);
        expect(secrets.length).toEqual(1);

        secrets = await SecretDAO.findByAuthClient(tokens.userToken2.value.tenant, authClient._id);
        expect(secrets.length).toEqual(1);
    });
});
