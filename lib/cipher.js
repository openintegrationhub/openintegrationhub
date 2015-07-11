var _ = require('lodash');
var crypto = require('crypto');

var ALGORYTHM = 'aes-256-cbc';

var PASSWORD = process.env.MESSAGE_CRYPTO_PASSWORD;
var VECTOR = process.env.MESSAGE_CRYPTO_IV;

exports.encrypt = encryptIV;
exports.decrypt = decryptIV;
exports.encryptMessageContent = encryptMessageContent;
exports.decryptMessageContent = decryptMessageContent;

function encryptIV(rawData) {
    if (!_.isString(rawData)) {
        throw new Error('RabbitMQ message cipher.encryptIV() accept only string as parameter.');
    }

    var data = encodeURIComponent(rawData);

    if (!PASSWORD) {
        return data;
    }
    if (!VECTOR) {
        throw new Error("process.env.MESSAGE_CRYPTO_IV is not set")
    }

    var encodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
    var cipher = crypto.createCipheriv(ALGORYTHM, encodeKey, VECTOR);
    return cipher.update(data, 'binary', 'base64') + cipher.final('base64');
}

function decryptIV(encData) {
    if (!_.isString(encData)) {
        throw new Error('RabbitMQ message cipher.decryptIV() accept only string as parameter.');
    }

    if (!PASSWORD) {
        return decodeURIComponent(encData);
    }
    if (!VECTOR) {
        throw new Error("process.env.MESSAGE_CRYPTO_IV is not set")
    }

    var decodeKey = crypto.createHash('sha256').update(PASSWORD, 'utf-8').digest();
    var cipher = crypto.createDecipheriv(ALGORYTHM, decodeKey, VECTOR);
    return decodeURIComponent(cipher.update(encData, 'base64', 'binary') + cipher.final('binary'));
}

function encryptMessageContent(messagePayload) {
    return exports.encrypt(JSON.stringify(messagePayload));
}

function decryptMessageContent(messagePayload) {
    if (!messagePayload || messagePayload.toString().length == 0) {
        return null;
    }
    try {
        return JSON.parse(exports.decrypt(messagePayload.toString()));
    } catch (err) {
        throw Error('Failed to decrypt message: ' + err.message);
    }
}