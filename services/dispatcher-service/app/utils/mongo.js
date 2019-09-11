/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */

// const mongoose = require('mongoose');
// const config = require('../config');

const Configuration = require('../models/configuration');
// const log = require('./logger');

const format = (configuration) => {
  const newConfig = configuration;
  if (newConfig && typeof newConfig === 'object') {
    delete newConfig._id;
    delete newConfig.__v;
  }
  return newConfig;
};

const getConfig = tenant => new Promise(async (resolve) => {
  const configuration = await Configuration.findOne({ tenant }).lean();
  resolve(format(configuration));
});

const upsertConfig = data => new Promise(async (resolve) => {
  const configuration = await Configuration.findOneAndUpdate(
    { tenant: data.tenant },
    data,
    { upsert: true, new: true, useFindAndModify: false },
  )
    .lean();
  resolve(format(configuration));
});

const deleteConfig = tenant => new Promise(async (resolve) => {
  const configuration = await Configuration.findOneAndDelete(
    { tenant },
    { useFindAndModify: false },
  )
    .lean();
  resolve(configuration);
});

const getConfigBySource = flowId => new Promise(async (resolve) => {
  const configuration = await Configuration.findOne({ 'connections.source.flowId': flowId }).lean();
  resolve(format(configuration));
});

module.exports = {
  getConfig, upsertConfig, deleteConfig, getConfigBySource,
};
