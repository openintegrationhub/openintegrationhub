/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */

const Configuration = require('../models/configuration');
const log = require('./logger'); //eslint-disable-line

const format = (configuration) => {
  const newConfig = configuration;
  if (newConfig && typeof newConfig === 'object') {
    if (Array.isArray(newConfig)) {
      for (let i = 0; i < newConfig.length; i += 1) {
        newConfig[i].id = newConfig[i]._id;
        delete newConfig[i]._id;
        delete newConfig[i].__v;
      }
    } else {
      newConfig.id = newConfig._id;
      delete newConfig._id;
      delete newConfig.__v;
    }
  }
  return newConfig;
};

const getConfigs = (tenant) => new Promise(async (resolve) => {
  const configurations = await Configuration.find({ tenant }).lean();
  if (!configurations || configurations.length === 0) {
    resolve(false);
  }
  resolve(format(configurations));
});

const getOneConfig = (tenant, id) => new Promise(async (resolve) => {
  const configuration = await Configuration.findOne({ tenant, _id: id }).lean();
  resolve(format(configuration));
});

const updateConfig = (data) => new Promise(async (resolve) => {
  const { id } = data;
  const config = data;
  delete config.id;

  const response = await Configuration.findOneAndUpdate(
    { _id: id },
    config,
    { new: true, useFindAndModify: false },
  ).lean();

  resolve(format(response));
});

const createConfig = (data) => new Promise(async (resolve) => {
  const saveConfig = new Configuration(data);
  const response = await saveConfig.save();
  resolve(format(response));
});

const deleteConfig = (tenant, id) => new Promise(async (resolve) => {
  const configuration = await Configuration.findOneAndDelete(
    { tenant, _id: id },
    { useFindAndModify: false },
  )
    .lean();
  resolve(format(configuration));
});

const getConfigBySource = (flowId) => new Promise(async (resolve) => {
  const configuration = await Configuration.findOne({ 'applications.outbound.flows.flowId': flowId }).lean();
  resolve(format(configuration));
});

module.exports = {
  getConfigs, getOneConfig, createConfig, deleteConfig, getConfigBySource, updateConfig,
};
