const Logger = require('@basaas/node-logger');
const moment = require('moment');
const pull = require('lodash/pull');
const { Event, EventBusManager, events } = require('@openintegrationhub/event-bus');
const crypto = require('../util/crypto');
const { OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;
const { ENCRYPT, DECRYPT } = require('../constant').CRYPTO.METHODS;
const { SENSITIVE_FIELDS } = require('../constant').CRYPTO;
const authFlowManager = require('../auth-flow-manager');
const AuthClientDAO = require('../dao/auth-client');

const Secret = require('../model/Secret');
const conf = require('../conf');
const CONSTANTS = require('../constant');

const auditLog = Logger.getAuditLogger(`${conf.logging.namespace}/secretDao`);

// retry refresh procedure after ms
const waitBeforeRetry = 1000;
const MAX_RETRY = 3;

const shouldAssumeRefreshTimeout = (secret) => moment().diff(secret.lockedAt) >= conf.refreshTimeout;
const shouldRefreshToken = (secret) => moment().diff(secret.value.expires) >= -conf.expirationOffset;

function cryptoSecret(secret, key, method = ENCRYPT, selection = []) {
    if (conf.crypto.isDisabled || !key || typeof key !== 'string') {
        return secret;
    }

    const fields = selection.length ? [...selection] : SENSITIVE_FIELDS;
    fields.forEach((field) => {
        if (secret.value[field]) {
            if (method === ENCRYPT) {
                if (secret.encryptedFields) {
                    if (secret.encryptedFields.indexOf(field) !== -1) {
                        throw (new Error(`Field ${field} already encrypted!`));
                    }
                    secret.encryptedFields.push(field);
                }
            } else if (secret.encryptedFields) {
                pull(secret.encryptedFields, field);
            }
            secret.value[field] = crypto[method](secret.value[field], key);
        }
    });
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

const getRandom = (min, max) => Math.floor(Math.random() * (max - min) + min);

const refresh = (secret, key, iter = 0) => new Promise(async (resolve, reject) => {
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
                    _secret = cryptoSecret(_secret, key, DECRYPT, _secret.encryptedFields);
                    const resp = await refreshToken(_secret);

                    if (resp.error) {
                        auditLog.error({ err: resp.error.toString() });
                        await Secret[secret.type].findOneAndUpdate(
                            { _id: secret._id },
                            { currentError: resp, lockedAt: null },
                            { new: true },
                        );
                        return reject(resp);
                    }

                    const { expires_in, access_token, refresh_token } = resp;

                    // FIXME expired or revoked token should throw
                    _secret.value.accessToken = access_token;

                    if (refresh_token) {
                        _secret.value.refresh_token = refresh_token;
                    }

                    _secret.value.expires = moment().add(expires_in, 'seconds').toISOString();

                    // store decrypted secret
                    decrypted = _secret.toObject();

                    // encrypt secret
                    _secret = cryptoSecret(_secret, key, ENCRYPT, _secret.encryptedFields);
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
            return resolve(await refresh(secret, key, iter));
        }
        if (iter < MAX_RETRY) {
            const randomDelay = getRandom(500, 1500);
            setTimeout(async () => {
                try {
                    return resolve(
                        await refresh(await Secret[secret.type].findById(secret._id), key, iter + 1),
                    );
                } catch (e) {
                    e.__errName = 'refresh with back-off failed';
                    auditLog.error(e);
                    return reject(e);
                }
            }, (waitBeforeRetry + ((iter || 0.25) * randomDelay)));
        } else {
            return reject(new Error('Max secret refresh retry iterations reached'));
        }
    } catch (err) {
        reject(err);
    }
});


module.exports = {
    async countByEntity(id) {
        return await Secret.full.countDocuments({
            'owners.id': id,
        });
    },
    async create(data, key = null) {
        let secret = new Secret[data.type]({ ...data });

        secret = cryptoSecret(secret, key, ENCRYPT);
        await secret.save();
        auditLog.debug('secret.created', { id: secret._id });
        const event = new Event({
            headers: {
                name: events['secrets.secret.created'],
            },
            payload: { name: secret.name },
        });
        EventBusManager.getEventBus().publish(event);

        return secret.toObject();
    },

    async getRefreshed(secret, key) {
        // refresh secrets with refreshToken only
        let _secret = secret;
        if (secret.type === OA2_AUTHORIZATION_CODE && secret.value.refreshToken) {
            _secret = await refresh(secret, key);
        }
        _secret = _secret.encryptedFields.indexOf('accessToken') !== -1
            ? cryptoSecret(_secret, key, DECRYPT, ['accessToken']) : _secret;

        const event = new Event({
            headers: {
                name: events['secrets.token.get'],
            },
            payload: { message: 'requested RAW Token' },
        });
        EventBusManager.getEventBus().publish(event);
        return _secret;
    },
    async findByEntityWithPagination(
        id,
        props,
    ) {
        return await Secret.full.find({
            'owners.id': id,
        },
        'name type value.authClientId value.scope value.expires value.externalId owners currentError',
        props);
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
            data = cryptoSecret(
                data,
                key,
                ENCRYPT,
            );

            Object.keys(data.value).forEach((entry) => {
                data[`value.${entry}`] = data.value[entry];
            });

            delete data.value;
        }

        let encryptedFields = [];

        if (data.encryptedFields) {
            encryptedFields = [...data.encryptedFields];
            delete data.encryptedFields;
        }

        const result = await Secret.full.findOneAndUpdate({
            _id: id,
        }, {
            $set: data,
            ...!conf.crypto.isDisabled ? {
                $addToSet: {
                    encryptedFields,
                },
            } : {},
        }, {
            new: true,
        }).lean();
        auditLog.info('secret.updated', { id });
        return result;
    },
    async delete({ id, ownerId, type = CONSTANTS.ENTITY_TYPE.USER }) {
        const toBeDeleted = await Secret.full.findOne({ _id: id });
        if (toBeDeleted.owners.length > 1) {
            toBeDeleted.owners = toBeDeleted.owners.filter((owner) => !(owner.id === ownerId && owner.type === type));
            await toBeDeleted.save();
            auditLog.info('secret.deleted.owner', { id, ownerId });
        } else {
            await Secret.full.deleteOne({ _id: id });
            auditLog.info('secret.deleted', { id });
            EventBusManager
                .getEventBus()
                .publish(new Event({
                    headers: {
                        name: events['secrets.secret.deleted'],
                    },
                    payload: { id },
                }));
        }
    },

    async deleteAll({ ownerId, type }) {
        const toBeDeleted = await Secret.full.find({ owners: { id: ownerId, type } });
        for (const secret of toBeDeleted) {
            if (secret.owners.length > 1) {
                // remove ownerid from owners
                secret.owners = secret.owners.filter((owner) => owner.id !== ownerId);
                await secret.save();
                auditLog.info('secret.deleted.owner', { id: secret._id, ownerId });
            } else {
                await Secret.full.deleteOne({ _id: secret._id });
                auditLog.info('secret.deleted', { id: secret._id });
                EventBusManager
                    .getEventBus()
                    .publish(new Event({
                        headers: {
                            name: events['secrets.secret.deleted'],
                        },
                        payload: { id: secret._id },
                    }));
            }
        }
    },

    async addOwner({ id, ownerId, type = CONSTANTS.ENTITY_TYPE.USER }) {
        const modifiedSecret = await Secret.full.findOneAndUpdate({
            _id: id,
        }, {
            $addToSet: {
                owners: {
                    id: ownerId,
                    type,
                },
            },
        }, {
            new: true,
        }).lean();
        auditLog.info('secret.owner.added', { id, ownerId, type });
        EventBusManager
            .getEventBus()
            .publish(new Event({
                headers: {
                    name: events['secrets.secret.ownerAdded'],
                },
                payload: { id, ownerId, type },
            }));
        return modifiedSecret;
    },

    async removeOwner({ id, ownerId, type = CONSTANTS.ENTITY_TYPE.USER }) {
        const modifiedSecret = await Secret.full.findOneAndUpdate({
            _id: id,
        }, {
            $pull: {
                owners: {
                    id: ownerId,
                    type,
                },
            },
        }, {
            new: true,
        }).lean();

        auditLog.info('secret.owner.removed', { id, ownerId, type });
        EventBusManager
            .getEventBus()
            .publish(new Event({
                headers: {
                    name: events['secrets.secret.ownerRemoved'],
                },
                payload: { id, ownerId, type },
            }));

        return modifiedSecret;
    },

    cryptoSecret,
};
