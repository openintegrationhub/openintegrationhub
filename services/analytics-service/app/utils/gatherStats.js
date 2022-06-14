/* eslint guard-for-in: "off" */

const { getFlows } = require('./helpers');
const { updateFlowStats, upsertFlowTemplateUsage, upsertComponentUsage } = require('../api/controllers/mongo');

async function getAndUpdateFlowStats(auth) {
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

  await updateFlowStats(active, inactive, total);
}

module.exports = {
  getAndUpdateFlowStats,
};
