var cipher = require('./cipher.js');

exports.encryptMessageContent = encryptMessageContent;
exports.decryptMessageContent = decryptMessageContent;

function encryptMessageContent(messagePayload) {
    return cipher.encrypt(JSON.stringify(messagePayload));
}

function decryptMessageContent(messagePayload) {
    if (!messagePayload || messagePayload.toString().length == 0) {
        return null;
    }
    try {
        return JSON.parse(cipher.decrypt(messagePayload.toString()));
    } catch (err) {
        throw Error('Failed to decrypt message: ' + err.message);
    }
}