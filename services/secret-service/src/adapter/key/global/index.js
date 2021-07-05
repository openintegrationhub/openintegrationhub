const conf = require('../../../conf');

module.exports = {
    async getKey() {
        return conf.crypto.key;
    },
    getKeyParameter() {},
};
