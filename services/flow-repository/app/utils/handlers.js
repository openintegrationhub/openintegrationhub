const mongoose = require('mongoose');
const log = require('../config/logger');
const config = require('../config/index');

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

async function flowStarted(id) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return false;
  }

  const response = await storage.startedFlow(id);
  if (!response) {
    log.error(`Flow with id ${id} could not be found.`);
  }
  return true;
}

async function flowStopped(id) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return false;
  }

  const response = await storage.stoppedFlow(id);
  if (!response) {
    log.error(`Flow with id ${id} could not be found.`);
  }
  return true;
}

async function gdprAnonymise(id) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return false;
  }

  if (!id) {
    log.warn('Received anonymise event without ID given');
    return true;
  }

  await storage.anonymise(id);

  return true;
}

module.exports = {
  flowStarted, flowStopped, gdprAnonymise,
};
