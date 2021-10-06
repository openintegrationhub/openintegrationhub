
const uuid = require('uuid');
const base64Url = require('base64-url');
const crypto = require('crypto');
const ms = require('ms');
const Logger = require('@basaas/node-logger');

const CONF = require('../conf');
const CONSTANTS = require('../constants');
const { RESTRICTED_PERMISSIONS } = require('../access-control/permissions');

const AccountsDAO = require('../dao/accounts');
const TokensDAO = require('../dao/tokens');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/util-token`);

module.exports = {

    _getNewExpireAt: (lifespan) => {
        if (parseInt(lifespan, 10) !== -1) {
            return { expireAt: new Date(new Date().getTime() + ms(lifespan)) };
        }

        return {};
    },

    sign: async (accountPayload, opts = {}) => {

        // opts.lifespan = opts.lifespan || CONF.jwt.expiresIn;

        let tokenExpireAt = {

        };

        // set expire to default
        if (opts.lifespan !== -1) {
            tokenExpireAt = module.exports._getNewExpireAt(opts.lifespan || CONF.jwt.expiresIn);
        }

        const query = {
            accountId: accountPayload._id,
            inquirer: accountPayload.inquirer,
            permissions: accountPayload.permissions,
            type: opts.type || (accountPayload.inquirer ? CONSTANTS.TOKEN_TYPES.DELEGATE : CONSTANTS.TOKEN_TYPES.SELF),
            tokenLifeSpan: opts.lifespan,
        };

        // Search for an existing token --> findOneAndUpdate?
        const existingToken = !opts.new && await TokensDAO.findOne(query).lean();

        if (existingToken) {
            await TokensDAO.update({
                id: existingToken._id,
                props: module.exports._getNewExpireAt(opts.lifespan || existingToken.tokenLifeSpan),
            });
            return existingToken;
        }

        const token = base64Url.encode(crypto.randomBytes(128));

        const newToken = await TokensDAO.create({
            ...query,
            description: accountPayload.description,
            token,
            initiator: accountPayload.initiator,
            tokenLifeSpan: opts.lifespan || CONF.jwt.expiresIn,
            permissions: accountPayload.permissions || [],
            ...tokenExpireAt,
        });

        return newToken;
    },

    fetchAndProlongToken: async (token) => {

        const existingToken = await TokensDAO.findOne({
            token,
        }).lean();

        if (existingToken) {
            await TokensDAO.update({
                id: existingToken._id,
                props: module.exports._getNewExpireAt(existingToken.tokenLifeSpan),
            });
            return existingToken;
        }

        return null;
    },

    verify: async (token, opts = {}) => {

        const existingToken = await module.exports.fetchAndProlongToken(token);

        return !!existingToken;

    },

    resolveUserPermissions: async (user) => {
        user.roles = user.roles || [];
        // FIXME
        let populatedRoles = user.roles;
        if (user._id && user.roles.length && !user.roles[0].name) {
            const accountData = await AccountsDAO.findOne({
                _id: user._id,
            }).populate('roles');
            populatedRoles = accountData.roles || [];
        }
        populatedRoles.forEach((role) => {
            user.permissions = user.permissions.concat(role.permissions);
        });
        user.isAdmin = !!user.permissions.find((permission) => permission === RESTRICTED_PERMISSIONS.all);

        return user;
    },

    getAccountData: async (token, opts = {}) => {

        const existingToken = await module.exports.fetchAndProlongToken(token);

        if (!existingToken) {
            return null;
        }

        log.debug(`fetching account data for id ${existingToken.accountId}`);
        let AccountData = await AccountsDAO.findOne({
            _id: existingToken.accountId,
        });

        if (!AccountData || AccountData.status !== CONSTANTS.STATUS.ACTIVE) {
            return null;
        }

        AccountData = await module.exports.resolveUserPermissions(AccountData);

        AccountData.permissions = Array.from(new Set((AccountData.permissions || []).concat(existingToken.permissions || [])));

        return AccountData;

    },

    deleteSessionToken: async ({ accountId }) => TokensDAO.deleteSessionToken({
        accountId,
    }),

};
