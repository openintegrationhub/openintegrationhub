module.exports = (connectors, flowString) => {
  const nodes = [];
  const edges = [];
  const edgesString = flowString.replace(/\s|\n|\t/g, '').split(',');

  for (const edge of edgesString) {
    const [source, target] = edge.split('->');
    const [sourceStep, sourceComponent, sourceFn] = source.split('.');
    const [targetStep, targetComponent, targetFn] = target.split('.');

    // setup source node
    if (!nodes.find((n) => n.id === sourceStep)) {
      nodes.push({
        id: sourceStep,
        componentId: connectors[sourceComponent].componentId,
        function: sourceFn,
      });
    }

    // setup target node
    if (!nodes.find((n) => n.id === targetStep)) {
      nodes.push({
        id: targetStep,
        componentId: connectors[targetComponent].componentId,
        function: targetFn,
      });
    }

    edges.push({
      source: sourceStep,
      target: targetStep,
    });
  }

  return {
    nodes,
    edges,
  };
};
