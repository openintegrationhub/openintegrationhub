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
    const allEvents = await getProvenanceEvents(user);

    const serviceCounts = {};

    for (let i = 0; i < allEvents.length; i += 1) {
      const currentEvent = allEvents[i];
      const serviceEntry = currentEvent.actedOnBehalfOf.find((el) => el.agentType === 'Application');
      if (!serviceEntry) continue;

      const serviceName = serviceEntry.actedOnbehalfOf;

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
async function getFlows(token) {
  const response = await fetch(
    config.flowRepoUrl,
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
}

module.exports = {
  getRefs,
  getFlows,
  getObjectDistribution,
};
