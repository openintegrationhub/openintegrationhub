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

async function getTargets(sourceFlow, operation) {
  const configuration = await storage.getConfigBySource(sourceFlow);
  if (!configuration) return false;
  const { applications } = configuration;
  const targetFlows = [];
  let schemaUri;

  // Find source, get its schema, then discard it for further processing
  for (let i = 0; i < applications.length; i += 1) {
    const app = applications[i];
    const found = app.outbound.flows.find((flow) => flow.flowId === sourceFlow);
    if (found) {
      schemaUri = found.schemaUri;  //eslint-disable-line
      applications.splice(i, 1);
      break;
    }
  }

  for (let j = 0; j < applications.length; j += 1) {
    const app = applications[j];
    if (app.inbound.active) {
      for (let k = 0; k < app.inbound.flows.length; k += 1) {
        const flow = app.inbound.flows[k];
        if (flow.operation === operation && flow.schemaUri === schemaUri) {
          targetFlows.push({ flowId: flow.flowId, applicationUid: app.applicationUid });
        }
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
    const targetPayload = lodash.cloneDeep(newPayload);
    delete targetPayload.meta.applicationUid;
    delete targetPayload.meta.recordUid;
    targetPayload.meta.applicationUid = targets[i].applicationUid;

    if (refs) {
      const ref = refs.find((element) => element.applicationUid === targets[i].applicationUid);

      if (ref) {
        targetPayload.meta.recordUid = ref.recordUid;
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
