const Logger = require('@basaas/node-logger');

const moment = require('moment');

const { OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;
const authFlowManager = require('../auth-flow-manager');
const AuthClientDAO = require('../dao/auth-client');


const Secret = require('../model/Secret');

const conf = require('./../conf');

const log = Logger.getLogger(`${conf.logging.namespace}/secretsDao`);

// retry refresh procedure after ms
const waitBeforeRetry = 1000;
//

const shouldAssumeRefreshTimeout = secret => moment().diff(secret.lockedAt) >= conf.refreshTimeout;
const shouldRefreshToken = secret => moment().diff(secret.value.expires) >= conf.expirationOffset;

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

const refresh = secret => new Promise(async (resolve, reject) => {
    try {
        if (!secret.lockedAt) {
            if (!shouldRefreshToken(secret)) {
                return resolve(secret);
            }

            const _secret = await Secret[secret.type].findOneAndUpdate(
                { _id: secret._id, lockedAt: { $eq: null } },
                { lockedAt: moment() },
                { new: true },
            );

            if (_secret) {
                if (shouldRefreshToken(_secret)) {
                    const { expires_in, access_token } = await refreshToken(_secret);

                    // FIXME expired or revoked token should throw

                    _secret.value.accessToken = access_token;
                    _secret.value.expires = moment().add(expires_in, 'seconds').toISOString();
                }

                _secret.lockedAt = null;

                await _secret.save();
                return resolve(_secret);
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
    async create(obj) {
        const secret = new Secret[obj.type]({ ...obj });
        await secret.save();
        return secret;
    },
    async findByEntityWithPagination(
        entityId,
        pageSize = conf.pagination.pageSize,
        pageNumber = conf.pagination.defaultPage,
    ) {
        return await Secret.full.find({
            'owner.entityId': entityId,
        }, null, { skip: (pageNumber - 1) * pageSize, limit: pageSize });
    },

    async countByEntity(entityId) {
        return await Secret.full.countDocuments({
            'owner.entityId': entityId,
        });
    },

    async findByExternalId(externalId, authClientId) {
        return await Secret.full.findOne({
            'value.externalId': externalId,
            'value.authClientId': authClientId,
        });
    },
    async find(query) {
        return await Secret.full.find(query);
    },

    async findOne(query) {
        return await Secret.full.findOne(query);
    },

    async update({ id, obj, partialUpdate = false }) {
        const updateOperation = partialUpdate ? { $set: obj } : obj;

        await Secret.full.findOneAndUpdate({
            _id: id,
        }, updateOperation);

        log.debug('updated.secret', { id });
    },
    async delete({ id }) {
        await Secret.full.deleteOne({ _id: id });
        log.info('deleted.secret', { id });
    },
    async getRefreshed(secret) {
        if (secret.type === OA2_AUTHORIZATION_CODE) {
            return await refresh(secret);
        }
        return secret;
    },

};
