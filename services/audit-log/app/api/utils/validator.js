/* eslint consistent-return: "off" */
// listen and receive events

const Ajv = require('ajv');
const config = require('../../config/index');
const log = require('../../config/logger');

const storage = require('../controllers/' + config.storage); // eslint-disable-line
const schema = require('../../models/log.json');
const payloadSchema = require('../../models/payload.json');

const ajv = new Ajv();
ajv.addSchema(payloadSchema);
const validator = ajv.compile(schema);

const validate = async function (msg) { // eslint-disable-line

  const valid = validator(msg);

  if (!valid) {
    log.error('Message format is not valid!');
    log.error(JSON.stringify(ajv.errors));
    return;
  }

  try {
    log.info('Saving event to DB...');
    await storage.addEvent(msg);
    log.info('Successfully Saved');
  } catch (error) {
    log.error('Save failed:');
    log.error(error);
  }
};

const gdprAnonymise = async function (msg) {
  if (!msg || !msg.id) {
    log.warn('Received gdpr event without ID');
    return;
  }

  try {
    await storage.anonymise(msg.id);
    log.info('Anonymisation finished.');
  } catch (e) {
    log.error(`Anonymisation failed: ${e}`);
  }
};


module.exports = { validate, gdprAnonymise };
