const storage = require('./mongo');
const log = require('./logger'); // eslint-disable-line

async function getTargets(sourceFlow) {
  const configuration = await storage.getConfigBySource(sourceFlow);
  const { connections } = configuration;

  for (let i = 0; i < connections.length; i += 1) {
    if (connections[i].source.flowId === sourceFlow) {
      return connections[i].targets;
    }
  }

  return [];
}

async function createDispatches(payload) {
  const targets = await getTargets(payload.meta.flowId);
  const evs = [];

  for (let i = 0; i < targets.length; i += 1) {
    const ev = {
      headers: {
        name: `dispatch.${targets[i].flowId}`,
      },
      payload,
    };
    evs.push(ev);
  }

  return evs;
}


module.exports = { createDispatches };
