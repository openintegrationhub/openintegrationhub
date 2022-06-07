const { getFlows } = require('./helpers');
const { createFlowStats } = require('../api/controllers/mongo');

async function updateFlowStats(auth) {
  const activeFlows = await getFlows(auth, 'active');
  const active = activeFlows.length;

  const inactiveFlows = await getFlows(auth, 'inactive');
  const inactive = inactiveFlows.length;

  const total = active + inactive;

  await createFlowStats(active, inactive, total);
}

module.exports = {
  updateFlowStats,
};
