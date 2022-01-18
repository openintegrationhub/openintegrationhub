const { v4 } = require('uuid');

module.exports = (graph) => {
  const newIds = {};
  const anonGraph = {
    ...graph,
  };

  for (let i = 0; i < anonGraph.nodes.length; i++) {
    const node = anonGraph.nodes[i];

    const newNode = {
      id: `${node.componentId}:${node.function}:${v4()}`,
      function: node.function,
      componentId: node.componentId,
    };

    // store reference to new node id
    newIds[node.id] = newNode.id;
    // replace with anon node
    anonGraph.nodes[i] = newNode;
  }

  // replace references in edges
  for (let i = 0; i < anonGraph.edges.length; i++) {
    anonGraph.edges[i].source = newIds[anonGraph.edges[i].source];
    anonGraph.edges[i].target = newIds[anonGraph.edges[i].target];
  }

  return anonGraph;
};
