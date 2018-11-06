const Logger = require('@basaas/node-logger');
const dayjs = require('dayjs');
const Token = require('../model/Token');

const conf = require('./../conf');

const log = Logger.getLogger(`${conf.logging.namespace}/token`);

module.exports = {

    create: async (obj) => {
        const token = new Token({ ...obj });
        await token.save();
        return token;
    },

    findBySecretIdAndRenew: async (secretId) => {
        const token = await Token.findOne({
            secretId,
        });

        // if (dayjs(token.expires))
    },

};
