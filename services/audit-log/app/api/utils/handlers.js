/* eslint consistent-return: "off" */
/* eslint no-underscore-dangle: "off" */
// listen and receive events

const config = require('../../config/index');
const log = require('../../config/logger');

const storage = require('./' + config.storage); //eslint-disable-line

const saveLog = async function (event) { // eslint-disable-line func-names
    try {
        await storage.addEvent(event);
    } catch (e) {
        log.error(e);
    }
};

const gdprAnonymise = async function (id) { // eslint-disable-line func-names
    try {
        const entries = await storage.getByUser(id);
        const promises = [];
        for (let i = 0; i < entries.length; i += 1) {
            const { payload } = entries[i];
            const keys = Object.keys(payload);

            if (payload.username) payload.username = 'XXXXXXXXXX';

            for (let j = 0; j < keys.length; j += 1) {
                if (payload[keys[j]] === id) payload[keys[j]] = 'XXXXXXXXXX';
            }
            promises.push(storage.updatePayload(entries[i]._id, payload));
        }

        await Promise.all(promises);

        log.info('Anonymisation finished.');
    } catch (e) {
        log.error(`Anonymisation failed: ${e}`);
    }
};

module.exports = { saveLog, gdprAnonymise };
