const { getFlows } = require('./helpers');
const { updateFlowStats } = require('../api/controllers/mongo');

async function updateFlowStats(auth) {
  const activeFlows = await getFlows(auth, 'active');
  const active = activeFlows.length;

  const inactiveFlows = await getFlows(auth, 'inactive');
  const inactive = inactiveFlows.length;

  const total = active + inactive;

  await updateFlowStats(active, inactive, total);
}

module.exports = {
  updateFlowStats,
};
