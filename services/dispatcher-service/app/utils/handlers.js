/* eslint no-await-in-loop: "off" */
const lodash = require('lodash');

const request = require('request-promise').defaults({
  simple: false,
  resolveWithFullResponse: true,
});
const storage = require('./mongo');
const log = require('./logger'); // eslint-disable-line
const config = require('../config');

async function checkFlows(targets) {
  for (let i = 0; i < targets.length; i += 1) {
    try {
      const getOptions = {
        method: 'GET',
        uri: `${config.flowRepoUrl}/flows/${targets[i].flowId}`,
        json: true,
        headers: {
          Authorization: `Bearer ${config.flowToken}`,
        },
      };

      const response = await request(getOptions);

      if (response.statusCode !== 200) {
        log.warn(`Flow with ID ${targets[i].flowId} could not be fetched`);
      } else if (response.body.data.status === 'inactive') {
        const startOptions = {
          method: 'POST',
          uri: `${config.flowRepoUrl}/flows/${targets[i].flowId}/start`,
          json: true,
          headers: {
            Authorization: `Bearer ${config.flowToken}`,
          },
        };

        await request(startOptions);
      }
    } catch (e) {
      log.error('Error while checking flows');
      log.error(e);
    }
  }
}

async function getTargets(sourceFlow) {
  const configuration = await storage.getConfigBySource(sourceFlow);
  if (!configuration) return false;
  const { connections } = configuration;
  const targetFlows = [];

  for (let i = 0; i < connections.length; i += 1) {
    if (connections[i].source.flowId === sourceFlow) {
      const { targets } = connections[i];
      for (let j = 0; j < targets.length; j += 1) {
        targetFlows.push({ flowId: targets[j].flowId, applicationUid: targets[j].applicationUid });
      }
    }
  }

  return targetFlows;
}

async function createDispatches(targets, payload) {
  const evs = [];
  const newPayload = payload;
  let refs;


  if (newPayload.meta.refs) {
    refs = payload.meta.refs;  // eslint-disable-line
    delete newPayload.meta.refs;
  }

  for (let i = 0; i < targets.length; i += 1) {
    const targetPayload = newPayload;
    targetPayload.meta.applicationUid = targets[i].applicationUid;

    if (refs) {
      const currentRef = refs.find(element => element.applicationUid === targets[i].applicationUid);

      if (currentRef) {
        targetPayload.meta.recordUid = currentRef.recordUid;
      }
    }

    const ev = {
      headers: {
        name: `dispatch.${targets[i].flowId}`,
      },
      payload: lodash.cloneDeep(targetPayload),
    };
    evs.push(ev);
  }
  return evs;
}


module.exports = { createDispatches, getTargets, checkFlows };
