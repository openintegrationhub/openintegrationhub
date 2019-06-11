const cipher = require('./cipher.js');
const log = require('./logging.js');

exports.encryptMessageContent = encryptMessageContent;
exports.decryptMessageContent = decryptMessageContent;

function encryptMessageContent(messagePayload) {
    return cipher.encrypt(JSON.stringify(messagePayload));
}

function decryptMessageContent(messagePayload, messageHeaders) {
    if (!messagePayload || messagePayload.toString().length === 0) {
        return null;
    }
    try {
        return JSON.parse(cipher.decrypt(messagePayload.toString(), messageHeaders));
    } catch (err) {
        log.error(err, 'Failed to decrypt message');
        throw Error('Failed to decrypt message: ' + err.message);
    }
}
