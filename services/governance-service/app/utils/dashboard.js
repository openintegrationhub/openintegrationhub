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

// Calculates object distribution by events
async function getObjectDistribution(user) {
  try {
    const allEvents = await getProvenanceEvents(user, 100, 1, false, false, false, false, false);

    const serviceCounts = {};

    for (let i = 0; i < allEvents.data.length; i += 1) {
      const currentEvent = allEvents.data[i];
      const serviceEntry = currentEvent.actedOnBehalfOf.find((el) => el.agentType === 'Application');
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

// Calculates object distribution and formats as a graph
async function getObjectDistributionAsGraph(user) {
  try {
    const allEvents = await getProvenanceEvents(user, 100, 1, false, false, false, false, false);

    const nodes = [];
    const edges = [];

    for (let i = 0; i < allEvents.data.length; i += 1) {
      const currentEvent = allEvents.data[i];
      const serviceEntry = currentEvent.actedOnBehalfOf.find((el) => el.agentType === 'Application');
      const flowEntry = currentEvent.actedOnBehalfOf.find((el) => el.agentType === 'Flow');
      if (!serviceEntry || !flowEntry) continue;

      const serviceName = serviceEntry.actedOnBehalfOf || 'unkownService';
      const flowId = flowEntry.actedOnBehalfOf || 'unknownFlow';

      let nodeIndex = nodes.findIndex((el) => el.data.id === serviceName);

      if (nodeIndex === -1) {
        nodes.push({
          data: {
            id: serviceName,
            created: 0,
            updated: 0,
            received: 0,
            deleted: 0,
          },
        });

        nodeIndex = nodes.length - 1;
      }

      let edgeIndex = edges.findIndex((el) => el.data.id === flowId);

      if (edgeIndex === -1) {
        edges.push({
          data: {
            id: flowId,
            created: 0,
            updated: 0,
            received: 0,
            deleted: 0,
            source: false,
            target: false,
          },
        });

        edgeIndex = edges.length - 1;
      }

      if (!edges[edgeIndex].data.source && currentEvent.activity.activityType === 'ObjectReceived') {
        edges[edgeIndex].data.source = serviceName;
      }

      if (!edges[edgeIndex].data.target && currentEvent.activity.activityType !== 'ObjectReceived') {
        edges[edgeIndex].data.target = serviceName;
      }

      switch (currentEvent.activity.activityType) {
      case 'ObjectReceived':
        nodes[nodeIndex].data.received += 1;
        edges[edgeIndex].data.received += 1;
        break;
      case 'ObjectUpdated':
        nodes[nodeIndex].data.updated += 1;
        edges[edgeIndex].data.updated += 1;
        break;
      case 'ObjectCreated':
        nodes[nodeIndex].data.created += 1;
        edges[edgeIndex].data.created += 1;
        break;
      case 'ObjectDeleted':
        nodes[nodeIndex].data.deleted += 1;
        edges[edgeIndex].data.deleted += 1;
        break;
      default:
        break;
      }
    }

    return { nodes, edges };
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
      `${config.flowRepoUrl}/flows?page=${currentPage}`,
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
        flowData: flows[i],
      });
    } else {
      for (let j = 0; j < flows[i].graph.nodes.length; j += 1) {
        if (!flows[i].graph.nodes[j].nodeSettings) {
          affectedFlows.push({
            flowId: flows[i].id,
            reason: 'No node settings',
            flowData: flows[i],
          });
          break;
        } else if ('governance' in flows[i].graph.nodes[j].nodeSettings) {
          if (flows[i].graph.nodes[j].nodeSettings.governance !== true) {
            affectedFlows.push({
              flowId: flows[i].id,
              reason: 'Governance is not set to true',
              flowData: flows[i],
            });
            break;
          }
        } else {
          affectedFlows.push({
            flowId: flows[i].id,
            reason: 'No governance settings',
            flowData: flows[i],
          });
          break;
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

  let affectedFlows = getFlowsWithProblematicSettings(flowReproResult.data);

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
  getObjectDistributionAsGraph,
  checkFlows,
};
