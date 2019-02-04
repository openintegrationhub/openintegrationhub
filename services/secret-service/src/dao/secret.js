const Logger = require('@basaas/node-logger');
const moment = require('moment');
const remove = require('lodash/remove');
const crypto = require('../util/crypto');
const { OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;
const { ENCRYPT, DECRYPT } = require('../constant').CRYPTO.METHODS;
const { SENSITIVE_FIELDS } = require('../constant').CRYPTO;
const authFlowManager = require('../auth-flow-manager');
const AuthClientDAO = require('../dao/auth-client');

const Secret = require('../model/Secret');
const conf = require('../conf');

const log = Logger.getLogger(`${conf.logging.namespace}/secretsDao`);


// retry refresh procedure after ms
const waitBeforeRetry = 1000;
//

const shouldAssumeRefreshTimeout = secret => moment().diff(secret.lockedAt) >= conf.refreshTimeout;
const shouldRefreshToken = secret => moment().diff(secret.value.expires) >= conf.expirationOffset;

function cryptoSecret(secret, key, method = ENCRYPT, selection = []) {
    if (!key) {
        return secret;
    }
    const processedFields = [];
    const fields = selection.length ? selection : SENSITIVE_FIELDS;
    fields.forEach((field) => {
        if (secret.value[field]) {
            if (method === ENCRYPT
                && secret.encryptedFields
                && secret.encryptedFields.indexOf(field) !== -1) {
                throw (new Error(`Field ${field} already encrypted!`));
            }
            secret.value[field] = crypto[method](secret.value[field], key);
            processedFields.push(field);
        }
    });

    if (secret.encryptedFields) {
        if (method === ENCRYPT) {
            processedFields.forEach((field) => {
                secret.encryptedFields.push(field);
            });
        } else {
            remove(secret.encryptedFields, field => processedFields.indexOf(field) !== -1);
        }
    }

    return secret;
}

function refreshToken(secret) {
    return new Promise(async (resolve, reject) => {
        try {
            const authClient = await AuthClientDAO.findById(secret.value.authClientId);

            resolve(await authFlowManager.refresh(
                authClient,
                secret,
            ));
        } catch (err) {
            reject(err);
        }
    });
}

const refresh = (secret, key) => new Promise(async (resolve, reject) => {
    try {
        if (!secret.lockedAt) {
            if (!shouldRefreshToken(secret)) {
                return resolve(secret);
            }

            let _secret = await Secret[secret.type].findOneAndUpdate(
                { _id: secret._id, lockedAt: { $eq: null } },
                { lockedAt: moment() },
                { new: true },
            );

            let decrypted = null;

            if (_secret) {
                if (shouldRefreshToken(_secret)) {
                    // decrypt _secret
                    _secret = cryptoSecret(_secret, key, DECRYPT);

                    const { expires_in, access_token } = await refreshToken(_secret);

                    // FIXME expired or revoked token should throw
                    _secret.value.accessToken = access_token;

                    _secret.value.expires = moment().add(expires_in, 'seconds').toISOString();

                    // store decrypted secret
                    decrypted = _secret.toObject();

                    // encrypt secret
                    _secret = cryptoSecret(_secret, key, ENCRYPT);
                }

                _secret.lockedAt = null;

                if (_secret.encryptedFields.length) {
                    _secret.encryptedFields.set(_secret.encryptedFields);
                }

                await _secret.save();
                if (!decrypted) {
                    return resolve(_secret);
                }

                return resolve(decrypted);
            }
        } else if (shouldAssumeRefreshTimeout(secret)) {
            secret.lockedAt = null;
            await secret.save();
            return resolve(await refresh(secret));
        }
        setTimeout(async () => resolve(
            await refresh(await Secret[secret.type].findById(secret._id)),
        ), waitBeforeRetry);
    } catch (err) {
        reject(err);
    }
});


module.exports = {
    async create(obj, key = null) {
        let secret = new Secret[obj.type]({ ...obj });
        secret = cryptoSecret(secret, key, ENCRYPT);
        await secret.save();
        return secret.toObject();
    },
    async findByEntityWithPagination(
        id,
        props,
    ) {
        return await Secret.full.find({
            'owners.id': id,
        },
        'name type value.scope value.expires owners',
        props);
    },

    async countByEntity(id) {
        return await Secret.full.countDocuments({
            'owners.id': id,
        });
    },

    async findByExternalId(externalId, authClientId) {
        return await Secret.full.findOne({
            'value.externalId': externalId,
            'value.authClientId': authClientId,
        });
    },
    async findOne(query) {
        return await Secret.full.findOne(query);
    },

    async update({ id, data }, key = null) {
        if (data.value) {
            const sensitiveFields = SENSITIVE_FIELDS.filter(
                field => Object.keys(data.value).indexOf(field) !== -1,
            );

            data = cryptoSecret(
                data,
                key,
                ENCRYPT,
                sensitiveFields,
            );

            Object.keys(data.value).forEach((entry) => {
                data[`value.${entry}`] = data.value[entry];
            });

            delete data.value;
        }

        const result = await Secret.full.findOneAndUpdate({
            _id: id,
        }, {
            $set: data,
        }, {
            new: true,
        }).lean();

        return result;
    },
    async delete({ id }) {
        await Secret.full.deleteOne({ _id: id });
        log.info('deleted.secret', { id });
    },
    async getRefreshed(secret, key) {
        // refresh secrets with refreshToken only
        let _secret = secret;
        if (secret.type === OA2_AUTHORIZATION_CODE && secret.value.refreshToken) {
            _secret = await refresh(secret, key);
            _secret = _secret.encryptedFields.indexOf('accessToken') !== -1
                ? cryptoSecret(_secret, key, DECRYPT, ['accessToken']) : _secret;
        }
        return _secret;
    },

    cryptoSecret,
};
