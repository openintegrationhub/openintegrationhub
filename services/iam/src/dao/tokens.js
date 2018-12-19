const Logger = require('@basaas/node-logger');
const Token = require('./../models/token');
const CONF = require('./../conf');

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

        log.debug('created.token', Object.assign({}, tokenData));

        auditLog.info('create.token', { data: tokenData });
        return token.toJSON();
    },

    update: async ({ id, props }) => {

        log.debug('update.token', { id, props });

        await Token.findOneAndUpdate({
            _id: id,
        }, { $set: props });

        log.info('updated.token', { id, props });
        auditLog.info('update.token', { data: props, id });

    },

    delete: async ({ id }) => {

        await Token.deleteOne({ _id: id });
        log.debug('deleted.token', { id });
        auditLog.info('delete.token', { data: { id } });
    },

};

module.exports = TokenDAO;
