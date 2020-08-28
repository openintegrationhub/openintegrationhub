const crypto = require('crypto');
const conf = require('../conf');

module.exports = {
    encrypt(value, key) {
        const cipher = crypto.createCipher(conf.crypto.alg.encryption, key);
        return cipher.update(value, 'utf8', conf.crypto.outputEncoding)
            + cipher.final(conf.crypto.outputEncoding);
    },

    decrypt(value, key) {
        const decipher = crypto.createDecipher(conf.crypto.alg.encryption, key);
        return decipher.update(value, conf.crypto.outputEncoding, 'utf8')
            + decipher.final('utf8');
    },
};
