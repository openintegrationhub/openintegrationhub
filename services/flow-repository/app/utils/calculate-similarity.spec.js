const mongoose = require('mongoose');
const generateGraph = require('./generate-graph');
const calculateGraphSimilarity = require('./calculate-similarity');

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
  c7: {
    componentId: mongoose.Types.ObjectId(),
  },
};

describe('Flow graph comparison', () => {
  test('Calculate similarity', async () => {
    const g1 = generateGraph(dummyConnectors, `
      a.c1.triggerA -> b.c2.actionA,
      a.c1.triggerA -> c.c3.actionA,
      a.c1.triggerA -> d.c4.finish
    `);

    const g2 = generateGraph(dummyConnectors, `
      d.c4.triggerA -> e.c5.actionA,
      e.c5.actionA -> f.c6.finish
    `);

    const g3 = generateGraph(dummyConnectors, `
      a.c1.triggerA -> b.c2.actionA,
      b.c2.actionA -> c.c3.actionA,
      c.c3.actionA -> d.c4.actionA,
      c.c3.actionA -> e.c3.finish
    `);

    const g4 = generateGraph(dummyConnectors, `
      a.c1.triggerB -> b.c2.actionA,
      b.c2.actionA -> c.c3.actionA,
      c.c3.actionA -> d.c4.actionA,
      d.c4.actionA -> e.c5.actionA,
      e.c5.actionA -> f.c6.finish
    `);

    const g5 = generateGraph(dummyConnectors, `
      a.c1.triggerA -> e.c5.actionA,
      e.c5.actionA -> f.c6.actionA,
      f.c6.actionA -> g.c7.finish
    `);

    const g6 = generateGraph(dummyConnectors, `
      a.c1.triggerA -> b.c2.actionA,
      b.c2.actionA -> c.c3.actionA,
      b.c2.actionA -> d.c4.finish
    `);

    const g7 = generateGraph(dummyConnectors, `
      a.c1.triggerA -> b.c2.actionA,
      b.c2.actionA -> c.c3.actionA,
      b.c2.actionA -> d.c4.finish1
    `);

    expect(
      calculateGraphSimilarity(g1, g1),
    ).toBe(1);
    expect(
      calculateGraphSimilarity(g1, g2),
    ).toBe(0);
    expect(
      calculateGraphSimilarity(g1, g3),
    ).toBe(0.25);
    expect(
      calculateGraphSimilarity(g1, g4),
    ).toBe(0.1);
    expect(
      calculateGraphSimilarity(g1, g5),
    ).toBe(0);

    expect(
      calculateGraphSimilarity(g2, g1),
    ).toBe(0);
    expect(
      calculateGraphSimilarity(g2, g2),
    ).toBe(1);
    expect(
      calculateGraphSimilarity(g2, g3),
    ).toBe(0);
    expect(
      calculateGraphSimilarity(g2, g4),
    ).toBe(0.3);
    expect(
      calculateGraphSimilarity(g2, g5),
    ).toBeCloseTo(0.166);

    expect(
      calculateGraphSimilarity(g3, g1),
    ).toBe(0.25);
    expect(
      calculateGraphSimilarity(g3, g2),
    ).toBe(0);
    expect(
      calculateGraphSimilarity(g3, g3),
    ).toBe(1);
    expect(
      calculateGraphSimilarity(g3, g4),
    ).toBe(0.5);
    expect(
      calculateGraphSimilarity(g3, g5),
    ).toBe(0);

    expect(
      calculateGraphSimilarity(g4, g1),
    ).toBe(0.1);
    expect(
      calculateGraphSimilarity(g4, g2),
    ).toBe(0.3);
    expect(
      calculateGraphSimilarity(g4, g3),
    ).toBe(0.5);
    expect(
      calculateGraphSimilarity(g4, g4),
    ).toBe(1);
    expect(
      calculateGraphSimilarity(g4, g5),
    ).toBe(0.1);

    expect(
      calculateGraphSimilarity(g5, g1),
    ).toBe(0);
    expect(
      calculateGraphSimilarity(g5, g2),
    ).toBeCloseTo(0.166);
    expect(
      calculateGraphSimilarity(g5, g3),
    ).toBe(0);
    expect(
      calculateGraphSimilarity(g5, g4),
    ).toBe(0.1);
    expect(
      calculateGraphSimilarity(g5, g5),
    ).toBe(1);

    expect(
      calculateGraphSimilarity(g6, g7),
    ).toBeCloseTo(0.833);
  });
});
