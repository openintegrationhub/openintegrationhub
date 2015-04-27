var _ = require('lodash');
var crypto = require('crypto');

var ALGORYTHM = 'aes-256-cbc';
var PASSWORD = process.env.MESSAGE_CRYPTO_PASSWORD;

exports.encrypt = encrypt;
exports.decrypt = decrypt;

/**
 * If env pwd not set enc will be skipped
 *
 * @param {string} rawData - original data to encrypt. String only.
 * @returns {data: String} - JSON with property 'data' which contains encrypted or pure data
 * */
function encrypt(rawData) {

    if (!_.isString(rawData)) {
        throw new Error('RabbitMQ message cipher.encrypt() accepts only a string as a parameter.');
    }

    var data = encodeURIComponent(rawData);

    if (!PASSWORD) {
        return data;
    }

    var cipher = crypto.createCipher(ALGORYTHM, PASSWORD);
    var encData = cipher.update(data, 'binary', 'base64');
    encData += cipher.final('base64');
    return encData;
}

/**
 * If env pwd not set decryption will be skipped
 *
 * @param {string} encData - string of encrypted data to decrypt
 * @returns {string} - decrypted end decoded data as string
 * */
function decrypt(encData) {
    if (!_.isString(encData)) {
        throw new Error('RabbitMQ message cipher.decrypt() accepts only a string as a parameter.');
    }
    if (!PASSWORD) {
        return decodeURIComponent(encData);
    }

    var decipher = crypto.createDecipher(ALGORYTHM, PASSWORD);
    var decData = decipher.update(encData, 'base64', 'binary');
    decData += decipher.final('binary');
    return decodeURIComponent(decData);
}
