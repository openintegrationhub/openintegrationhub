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
    let mongooseSchema;

    // Components schema
    newSchema = JSON.parse(JSON.stringify(componentsData));
    newSchema.createdAt = { type: Date, expires, default: Date.now };

    log.info('key', key);
    log.info('Schema', newSchema);
    let collectionKey = `components_${key}`;

    if (collectionKey in models) continue; // eslint-disable-line

    mongooseSchema = new Schema(newSchema, { collection: collectionKey, timestamps: true });
    models[collectionKey] = mongoose.model(collectionKey, mongooseSchema);

    // Flow schema
    newSchema = JSON.parse(JSON.stringify(flowData));
    newSchema.createdAt = { type: Date, expires, default: Date.now };

    log.info('key', key);
    log.info('Schema', newSchema);
    collectionKey = `flows_${key}`;

    mongooseSchema = new Schema(newSchema, { collection: collectionKey, timestamps: true });
    console.log(models);
    models[collectionKey] = mongoose.model(collectionKey, mongooseSchema);

    // Flow template schema
    newSchema = JSON.parse(JSON.stringify(flowTemplateData));
    newSchema.createdAt = { type: Date, expires, default: Date.now };

    log.info('key', key);
    log.info('Schema', newSchema);
    collectionKey = `flowTemplates_${key}`;

    mongooseSchema = new Schema(newSchema, { collection: collectionKey, timestamps: true });
    models[collectionKey] = mongoose.model(collectionKey, mongooseSchema);
  }
};

module.exports = models;
