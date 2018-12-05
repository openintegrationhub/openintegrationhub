const moment = require('moment');

const authFlowManager = require('../auth-flow-manager');
const Token = require('../model/Token');
const AuthClientDAO = require('../dao/auth-client');

const waitBeforeRetry = 30;
const expirationOffset = -300;

const refreshTimeout = 300;

const shouldAssumeRefreshTimeout = token => moment().diff(token.lockedAt) >= refreshTimeout;
const shouldRefreshToken = token => moment().diff(token.expires) >= expirationOffset;

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

const get = secret => new Promise(async (resolve, reject) => {
    try {
        let token = await Token.findOne({
            secretId: secret._id,
        });

        if (!token) {
            resolve(null);
        }
        if (!token.lockedAt) {
            if (!shouldRefreshToken(token)) {
                return resolve(token);
            }

            token = await Token.findOneAndUpdate(
                { secretId: secret._id, lockedAt: { $eq: null } },
                { lockedAt: moment() },
                { new: true },
            );
            if (token) {
                // check token expiration again to prevent unnecessary refreshing
                if (shouldRefreshToken(token)) {
                    const refreshed = await refreshToken(secret);

                    const expires = moment().add(refreshed.expires_in, 'seconds');

                    secret.value.expires = expires;
                    await secret.save();

                    token.value = refreshed.access_token;
                    token.expires = expires;
                }

                token.lockedAt = null;

                await token.save();
                return resolve(token);
            }
            setTimeout(async () => resolve(await get(secret)), waitBeforeRetry);
        } else if (shouldAssumeRefreshTimeout(token)) {
            token.lockedAt = null;
            await token.save();
            resolve(await get(secret));
        } else {
            setTimeout(async () => resolve(await get(secret)), waitBeforeRetry);
        }
    } catch (err) {
        reject(err);
    }
});

module.exports = {
    async create(obj) {
        const token = new Token({ ...obj });
        await token.save();
        return token;
    },
    async getOrWait(secret) {
        try {
            return await get(secret);
        } catch (err) {
            return null;
        }
    },
    async findBySecretId(secretId) {
        return await Token.findOne({ secretId });
    },
};
