const Logger = require('@basaas/node-logger');
const { Event, EventBusManager } = require('@openintegrationhub/event-bus');
const Token = require('../models/token');
const CONF = require('../conf');
const CONSTANTS = require('../constants');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/tokenDao`);
const auditLog = Logger.getAuditLogger('token');

const TokenDAO = {

    find: (filter) => {

        const query = filter || {};

        return Token.find(query).lean();
    },

    findOne: (filter) => {
        const query = filter || {};

        return Token.findOne(query).lean();
    },

    create: async (tokenData) => {

        const token = new Token(tokenData);

        await token.save();

        log.debug('created.token', { ...tokenData });
        const event = new Event({
            headers: {
                name: 'iam.token.created',
            },
            payload: { id: token._id.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        if (tokenData.accountId) {
            tokenData.accountId = tokenData.accountId.toString();
        }
        auditLog.info('create.token', { data: tokenData });
        return token.toJSON();
    },

    update: async ({ id, props }) => {

        log.debug('update.token', { id: id.toString(), props });

        await Token.findOneAndUpdate({
            _id: id,
        }, { $set: props });

        log.debug('updated.token', { id: id.toString(), props });
        const event = new Event({
            headers: {
                name: 'iam.token.modified',
            },
            payload: { id: id.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('update.token', { data: props, id: id.toString() });

    },

    delete: async ({ id }) => {

        await Token.deleteOne({ _id: id });
        log.debug('deleted.token', { id: id.toString() });
        const event = new Event({
            headers: {
                name: 'iam.token.deleted',
            },
            payload: { id: id.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('delete.token', { data: { id: id.toString() } });
    },

    deleteSessionToken: async ({ accountId }) => {

        await Token.deleteOne({ accountId, type: CONSTANTS.TOKEN_TYPES.SELF });
        log.debug('deleted.sessionToken', { accountId });
        const event = new Event({
            headers: {
                name: 'iam.token.deleted',
            },
            payload: { account: accountId.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('delete.sessionToken', { data: { accountId: accountId.toString() } });
    },

    deleteAllAccountTokens: async ({ accountId }) => {

        await Token.deleteMany({ accountId });
        log.debug('deleted.allUserTokens', { accountId });
        const event = new Event({
            headers: {
                name: 'iam.token.deleted',
            },
            payload: { account: accountId.toString() },
        });
        EventBusManager.getEventBus().publish(event);
        auditLog.info('delete.allUserTokens', { data: { accountId: accountId.toString() } });
    },

};

module.exports = TokenDAO;
