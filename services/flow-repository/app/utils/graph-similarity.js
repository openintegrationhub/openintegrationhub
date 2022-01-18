module.exports = {
  calculateNeighbors(flowGraph) {
    const idMapping = {};
    const nodes = [];
    const neighborsPerNode = {};

    for (const node of flowGraph.nodes) {
      idMapping[node.id] = node.componentId;
      nodes.push(idMapping[node.id]);
    }

    for (const edge of flowGraph.edges) {
      if (!neighborsPerNode[idMapping[edge.source]]) neighborsPerNode[idMapping[edge.source]] = { in: [], out: [] };
      if (!neighborsPerNode[idMapping[edge.target]]) neighborsPerNode[idMapping[edge.target]] = { in: [], out: [] };
      neighborsPerNode[idMapping[edge.source]].out.push(idMapping[edge.target]);
      neighborsPerNode[idMapping[edge.target]].in.push(idMapping[edge.source]);
    }

    return {
      nodes,
      neighborsPerNode,
    };
  },

  calculateGraphSimilarity(g1, g2) {
    let score = 0;
    const neighborsG1 = module.exports.calculateNeighbors(g1);
    const neighborsG2 = module.exports.calculateNeighbors(g2);

    for (const [componentId, neighbors] of Object.entries(neighborsG1.neighborsPerNode)) {
      for (const neighborInComponentId of neighbors.in) {
        if (neighborsG2.neighborsPerNode[neighborInComponentId] && neighborsG2.neighborsPerNode[neighborInComponentId].out.includes(componentId)) {
          score++;
        }
      }
      for (const neighborOutComponentId of neighbors.out) {
        if (neighborsG2.neighborsPerNode[neighborOutComponentId] && neighborsG2.neighborsPerNode[neighborOutComponentId].in.includes(componentId)) {
          score++;
        }
      }
    }

    let normalizedScore = score;

    if (neighborsG1.nodes.length) {
      normalizedScore = score / Object.entries(neighborsG1.neighborsPerNode).map((a) => a[1].in.length + a[1].out.length).reduce((a, b) => a + b);
    }

    return normalizedScore;
  },
};
