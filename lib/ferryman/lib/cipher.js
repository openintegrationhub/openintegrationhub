const _ = require('lodash');
const crypto = require('crypto');
const debug = require('debug')('sailor:cipher');

const ALGORYTHM = 'aes-256-cbc';

function encryptIV(rawData, outputEncoding) {
    const PASSWORD = process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD;
    const VECTOR = process.env.ELASTICIO_MESSAGE_CRYPTO_IV;

    debug('About to encrypt:', rawData);

    if (!_.isString(rawData)) {
        throw new Error('RabbitMQ message cipher.encryptIV() accepts only string as parameter.');
    }

    let res;
    if (!PASSWORD) {
        res = Buffer.from(rawData);
    } else {
        if (!VECTOR) {
            throw new Error('process.env.ELASTICIO_MESSAGE_CRYPTO_IV is not set');
        }

        const encodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
        const cipher = crypto.createCipheriv(ALGORYTHM, encodeKey, VECTOR);
        res = Buffer.concat([
            Buffer.from(cipher.update(rawData, 'utf8', outputEncoding)),
            Buffer.from(cipher.final(outputEncoding))
        ]);
    }

    return res;
}

function decryptIV(encData, inputEncoding) {
    const PASSWORD = process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD;
    const VECTOR = process.env.ELASTICIO_MESSAGE_CRYPTO_IV;

    if (!PASSWORD) {
        return encData;
    }

    if (!VECTOR) {
        throw new Error('process.env.ELASTICIO_MESSAGE_CRYPTO_IV is not set');
    }

    const decodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
    const decipher = crypto.createDecipheriv(ALGORYTHM, decodeKey, VECTOR);

    const data = inputEncoding ? encData.toString() : encData;

    return decipher.update(data, inputEncoding, 'utf8') + decipher.final('utf8');
}

exports.id = 1;
exports.encrypt = encryptIV;
exports.decrypt = decryptIV;
