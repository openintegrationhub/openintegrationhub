const cipher = require('./cipher.js');
const log = require('./logging.js');

function encryptMessageContent(messagePayload, outputEncoding) {
    return cipher.encrypt(JSON.stringify(messagePayload), outputEncoding);
}

function decryptMessageContent(messagePayload, inputEncoding) {
    if (!messagePayload || messagePayload.length === 0) {
        return null;
    }
    try {
        return JSON.parse(cipher.decrypt(messagePayload, inputEncoding));
    } catch (err) {
        log.error(err, 'Failed to decrypt message');
        throw Error(`Failed to decrypt message: ${err.message}`);
    }
}

exports.encryptMessageContent = encryptMessageContent;
exports.decryptMessageContent = decryptMessageContent;
