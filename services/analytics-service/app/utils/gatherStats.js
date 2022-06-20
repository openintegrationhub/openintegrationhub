/* eslint guard-for-in: "off" */
/* eslint no-continue: "off" */
const dayjs = require('dayjs');
const log = require('../config/logger');

const {
  getFlows,
  getAllComponents,
  getAllTemplates,
  getUsers,
} = require('./helpers');

const {
  updateFlowStats,
  upsertFlowTemplateUsage,
  upsertComponentUsage,
  upsertComponent,
  upsertFlowTemplate,
  updateUserStats,
} = require('../api/controllers/mongo');

const config = require('../config');

async function getAndUpdateFlowStats(auth) {
  log.info('Fetching Flows');
  const activeFlows = await getFlows(auth, 'active');
  const active = activeFlows.length;

  const componentUsage = {};
  const templateUsage = {};

  for (let i = 0; i < active; i += 1) {
    const flowId = activeFlows[i].id;

    if (activeFlows[i].graph && activeFlows[i].graph.nodes) {
      const numNodes = activeFlows[i].graph.nodes.length;
      for (let j = 0; j < numNodes; j += 1) {
        const componentId = activeFlows[i].graph.nodes[j].componentId;
        if (componentId in componentUsage) {
          componentUsage[componentId].push(flowId);
        } else {
          componentUsage[componentId] = [flowId];
        }
      }
    }

    if (activeFlows[i].fromTemplate) {
      if (activeFlows[i].fromTemplate in templateUsage) {
        templateUsage[activeFlows[i].fromTemplate].push(flowId);
      } else {
        templateUsage[activeFlows[i].fromTemplate] = [flowId];
      }
    }

    // activeFlows[i].owners
  }

  for (const templateId in templateUsage) {
    upsertFlowTemplateUsage(templateId, templateUsage[templateId]);
  }

  for (const componentId in componentUsage) {
    upsertComponentUsage(componentId, componentUsage[componentId]);
  }

  const inactiveFlows = await getFlows(auth, 'inactive');
  const inactive = inactiveFlows.length;

  const total = active + inactive;

  log.info(`Found ${total} number of flows`);

  await updateFlowStats({ active, inactive, total });
}

async function getAndUpdateComponents(auth) {
  const components = await getAllComponents(auth);

  const length = components.length;
  for (let i = 0; i < length; i += 1) {
    await upsertComponent(components[i]);
  }
}

async function getAndUpdateFlowTemplates(auth) {
  const flowTemplates = await getAllTemplates(auth);

  const length = flowTemplates.length;
  for (let i = 0; i < length; i += 1) {
    await upsertFlowTemplate(flowTemplates[i]);
  }
}

async function getAndUpdateUserStats(auth) {
  try {
    const users = await getUsers(auth);
    const activeDay = dayjs().subtract(config.userRecentlyActivePeriod, 'day');
    const inactiveDay = dayjs().subtract(config.userInactivePeriod, 'day');

    const userStats = {
      total: users.length,
      recentlyActive: 0,
      inactive: 0,
    };

    for (let i = 0; i < users.length; i += 1) {
      const loginDate = dayjs(users[i].safeguard.lastLogin);

      if (!loginDate.isValid()) continue;

      if (loginDate.isAfter(activeDay)) {
        userStats.recentlyActive += 1;
      } else if (loginDate.isBefore(inactiveDay)) {
        userStats.inactive += 1;
      }
    }

    await updateUserStats(userStats);
  } catch (e) {
    log.error(e);
  }
}

module.exports = {
  getAndUpdateFlowStats,
  getAndUpdateComponents,
  getAndUpdateFlowTemplates,
  getAndUpdateUserStats,
};
