const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const { componentsData } = require('./schemas/componentsData.schemaObject');
const { flowData } = require('./schemas/flowData.schemaObject');
const { flowTemplateData } = require('./schemas/flowTemplateData.schemaObject');

const log = require('../config/logger');
const config = require('../config/index');

const models = {};

models.createModels = () => {
  // Create collections for each configured time window
  for (const key in config.timeWindows) { // eslint-disable-line guard-for-in
    log.info('Creating schema for', key);
    let expires;
    if (key in config.storageWindows) {
      expires = `${config.storageWindows[key]}s`;
    } else {
      log.error('You need to set the storage window or it will default to 24h');
      expires = '24h';
    }

    log.info('Warning: Ensuring DB index for expiry. If one already existed it will not be changed.');
    let newSchema;

    // Components schema
    newSchema = JSON.parse(JSON.stringify(componentsData));
    newSchema.createdAt = { type: Date, expires, default: Date.now };

    log.info('key', key);
    log.info('Schema', newSchema);
    let collectionKey = `components_${key}`;
    models[collectionKey] = new Schema(newSchema, { collection: collectionKey, timestamps: true });

    // Flow schema
    newSchema = JSON.parse(JSON.stringify(flowData));
    newSchema.createdAt = { type: Date, expires, default: Date.now };

    log.info('key', key);
    log.info('Schema', newSchema);
    collectionKey = `flows_${key}`;
    models[collectionKey] = new Schema(newSchema, { collection: collectionKey, timestamps: true });

    // Flow template schema
    newSchema = JSON.parse(JSON.stringify(flowTemplateData));
    newSchema.createdAt = { type: Date, expires, default: Date.now };

    log.info('key', key);
    log.info('Schema', newSchema);
    collectionKey = `flowTemplates_${key}`;
    models[collectionKey] = new Schema(newSchema, { collection: collectionKey, timestamps: true });
  }
};

module.exports = models;
