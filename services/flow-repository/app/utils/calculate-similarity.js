function countNeighbors(neighbors) {
  return Object
    .entries(neighbors)
    .map((a) => a[1].in.length + a[1].out.length)
    .reduce((a, b) => a + b);
}

function generateNeighbors(flowGraph) {
  const idMapping = {};
  const nodes = [];
  const neighbors = {};

  for (const node of flowGraph.nodes) {
    idMapping[node.id] = node.componentId.toString();
    nodes.push(idMapping[node.id]);
  }

  for (const edge of flowGraph.edges) {
    const idSource = idMapping[edge.source].toString();
    const idTarget = idMapping[edge.target].toString();
    const sourceFunction = flowGraph.nodes.find((n) => n.id === edge.source).function.toString();
    const targetFunction = flowGraph.nodes.find((n) => n.id === edge.target).function.toString();

    neighbors[idSource] = neighbors[idSource] || { in: [], out: [] };
    neighbors[idSource + sourceFunction] = neighbors[idSource + sourceFunction] || { in: [], out: [] };
    neighbors[idTarget] = neighbors[idTarget] || { in: [], out: [] };
    neighbors[idTarget + targetFunction] = neighbors[idTarget + targetFunction] || { in: [], out: [] };

    neighbors[idSource].out.push(idTarget);
    neighbors[idSource + sourceFunction].out.push(idTarget + targetFunction);

    neighbors[idTarget].in.push(idSource);
    neighbors[idTarget + targetFunction].in.push(idSource + sourceFunction);
  }

  return {
    nodes,
    neighbors,
  };
}

module.exports = (g1, g2) => {
  let score = 0;
  const neighborsG1 = generateNeighbors(g1);
  const neighborsG2 = generateNeighbors(g2);

  for (const [id, neighbors] of Object.entries(neighborsG1.neighbors)) {
    for (const idOut of neighbors.out) {
      if (neighborsG2.neighbors[idOut]
          && neighborsG2.neighbors[idOut].in.includes(id)) {
        score++;
      }
    }
    for (const idIn of neighbors.in) {
      if (neighborsG2.neighbors[idIn]
          && neighborsG2.neighbors[idIn].out.includes(id)) {
        score++;
      }
    }
  }

  let normalizedScore = score;

  const sizeG1 = countNeighbors(neighborsG1.neighbors);
  const sizeG2 = countNeighbors(neighborsG2.neighbors);

  const maxSize = sizeG1 >= sizeG2 ? sizeG1 : sizeG2;

  if (maxSize !== 0) {
    normalizedScore = score / maxSize;
  }

  return normalizedScore;
};
