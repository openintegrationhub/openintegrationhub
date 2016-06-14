var _ = require('lodash');
var crypto = require('crypto');
var debug = require('debug')('sailor:cipher');

var ALGORYTHM = 'aes-256-cbc';
var PASSWORD = process.env.ELASTICIO_MESSAGE_CRYPTO_PASSWORD;
var VECTOR = process.env.ELASTICIO_MESSAGE_CRYPTO_IV;

exports.id = 1;
exports.encrypt = encryptIV;
exports.decrypt = decryptIV;

function encryptIV(rawData) {
    debug('About to encrypt:', rawData);

    if (!_.isString(rawData)) {
        throw new Error('RabbitMQ message cipher.encryptIV() accepts only string as parameter.');
    }

    if (!PASSWORD) {
        return rawData;
    }

    if (!VECTOR) {
        throw new Error('process.env.ELASTICIO_MESSAGE_CRYPTO_IV is not set');
    }

    var encodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
    var cipher = crypto.createCipheriv(ALGORYTHM, encodeKey, VECTOR);
    return cipher.update(rawData, 'utf-8', 'base64') + cipher.final('base64');
}

function decryptIV(encData, options) {
    debug('About to decrypt:', encData);

    options = options || {};

    if (!_.isString(encData)) {
        throw new Error('RabbitMQ message cipher.decryptIV() accepts only string as parameter.');
    }

    if (!PASSWORD) {
        return encData;
    }

    if (!VECTOR) {
        throw new Error('process.env.ELASTICIO_MESSAGE_CRYPTO_IV is not set');
    }

    var decodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
    var cipher = crypto.createDecipheriv(ALGORYTHM, decodeKey, VECTOR);

    var result = cipher.update(encData, 'base64', 'utf-8') + cipher.final('utf-8');

    return result;
}
