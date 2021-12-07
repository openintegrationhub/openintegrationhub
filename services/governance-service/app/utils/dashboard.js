/* eslint no-continue: "off" */

const fetch = require('node-fetch');
const config = require('../config/index');
const log = require('../config/logger');
const { getProvenanceEvents } = require('../api/controllers/mongo');

// Get all refs of a given object
async function getRefs(id, recordUid, token) {
  if (!id && !recordUid) return false;

  const url = id ? `${config.dataHubUrl}/${id}` : `${config.dataHubUrl}/recordId/${id}`;

  const response = await fetch(
    url,
    {
      method: 'GET',
      headers: {
        Authorization: token,
      },
    },
  );

  if (response.status !== 200) return false;

  const object = response.json();
  if (!object || !object.refs) return false;

  return {
    refs: object.refs,
    id: object.id,
  };
}

// Calculates object distribution by refs
async function getObjectDistribution(user) {
  try {
    const allEvents = await getProvenanceEvents(user, 100, 1, false, false, false, false, false);

    const serviceCounts = {};

    for (let i = 0; i < allEvents.data.length; i += 1) {
      const currentEvent = allEvents.data[i];
      const serviceEntry = currentEvent.actedOnBehalfOf.find(el => el.agentType === 'Application');
      if (!serviceEntry) continue;

      const serviceName = serviceEntry.actedOnBehalfOf || 'unkownService';

      if (!(serviceName in serviceCounts)) {
        serviceCounts[serviceName] = {
          received: 0,
          updated: 0,
          created: 0,
          deleted: 0,
        };
      }

      switch (currentEvent.activity.activityType) {
      case 'ObjectReceived':
        serviceCounts[serviceName].received += 1;
        break;
      case 'ObjectUpdated':
        serviceCounts[serviceName].updated += 1;
        break;
      case 'ObjectCreated':
        serviceCounts[serviceName].created += 1;
        break;
      case 'ObjectDeleted':
        serviceCounts[serviceName].deleted += 1;
        break;
      default:
        break;
      }
    }

    return serviceCounts;
  } catch (e) {
    log.error(e);
    return false;
  }
}

// Get flows of a user and check if any cause a warning
async function getFlows(token, page) {
  try {
    const currentPage = (page && page > 0) ? page : 1;
    const response = await fetch(
      `${config.flowRepoUrl}?page=${currentPage}`,
      {
        method: 'GET',
        headers: {
          Authorization: token,
        },
      },
    );

    if (response.status !== 200) return false;

    const flows = response.json();
    return flows;
  } catch (e) {
    log.error(e);
    return false;
  }
}

function getFlowsWithProblematicSettings(flows) {
  const affectedFlows = [];
  for (let i = 0; i < flows.length; i += 1) {
    if (!flows[i].graph || !flows[i].graph.nodes) {
      affectedFlows.push({
        flowId: flows[i].id,
        reason: 'No graph or nodes',
      });
    } else {
      for (let j = 0; j < flows[i].graph.nodes.length; j += 1) {
        if (!flows[i].graph.nodes[j].nodeSettings) {
          affectedFlows.push({
            flowId: flows[i].id,
            reason: 'No node settings',
          });
        } else if ('governance' in flows[i].graph.nodes[j].nodeSettings) {
          if (flows[i].graph.nodes[j].nodeSettings.governance !== true) {
            affectedFlows.push({
              flowId: flows[i].id,
              reason: 'Governance is not set to true',
            });
          }
        } else {
          affectedFlows.push({
            flowId: flows[i].id,
            reason: 'No governance settings',
          });
        }
      }
    }
  }

  return affectedFlows;
}

// Iterate over all flows and check the settings
async function checkFlows(token) {
  let totalPages = 1;
  let flowReproResult = await getFlows(token);
  if (flowReproResult
      && 'meta' in flowReproResult
      && 'totalPages' in flowReproResult.meta
  ) {
    totalPages = flowReproResult.meta.totalPages;
  }

  let affectedFlows = getFlowsWithProblematicSettings(flowReproResult);

  let page = 2;
  while (page <= totalPages) {
    flowReproResult = await getFlows(token, page);
    affectedFlows = affectedFlows.concat(getFlowsWithProblematicSettings(flowReproResult));
    page += 1;
  }

  return affectedFlows;
}

module.exports = {
  getRefs,
  getFlows,
  getObjectDistribution,
  checkFlows,
};
