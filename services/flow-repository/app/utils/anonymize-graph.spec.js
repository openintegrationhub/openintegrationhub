const mongoose = require('mongoose');
const generateGraph = require('./generate-graph');
const anonymizeGraph = require('./anonymize-graph');

const dummyConnectors = {
  c1: {
    componentId: mongoose.Types.ObjectId(),
  },
  c2: {
    componentId: mongoose.Types.ObjectId(),
  },
  c3: {
    componentId: mongoose.Types.ObjectId(),
  },
  c4: {
    componentId: mongoose.Types.ObjectId(),
  },
  c5: {
    componentId: mongoose.Types.ObjectId(),
  },
  c6: {
    componentId: mongoose.Types.ObjectId(),
  },
};

describe('Anonymize flow graph', () => {
  test('Anonymize properly', async () => {
    const graph = generateGraph(dummyConnectors, `
      step1.c1.trigger -> step2.c2.action, 
      step1.c1.trigger -> step3.c3.action, 
      step3.c3.action -> step4.c4.action,
      step4.c4.action -> step5.c4.finish
    `);

    const anonGraph = anonymizeGraph(graph);

    const removedEntries = /step1|step2|step3|step4|step5/;

    for (const node of anonGraph.nodes) {
      expect(node.id).not.toMatch(removedEntries);
    }

    for (const edge of anonGraph.edges) {
      expect(edge.source).not.toMatch(removedEntries);
      expect(edge.target).not.toMatch(removedEntries);
    }
  });
});
