const { calculateGraphSimilarity } = require('./graph-similarity');

describe('Flow graph comparison', () => {
  test('Calculate similarity', async () => {
    const g1 = {
      nodes: [
        {
          id: 'a',
          function: 'function',
          componentId: '1',
        },
        {
          id: 'b',
          function: 'function',
          componentId: '2',
        },
        {
          id: 'c',
          function: 'function',
          componentId: '3',
        },
        {
          id: 'd',
          function: 'function',
          componentId: '4',
        },
      ],
      edges: [
        {
          source: 'a',
          target: 'b',
        },
        {
          source: 'a',
          target: 'c',
        },
        {
          source: 'a',
          target: 'd',
        },
      ],

    };

    const g2 = {
      nodes: [
        {
          id: 'd',
          function: 'function',
          componentId: '4',
        },
        {
          id: 'e',
          function: 'function',
          componentId: '5',
        },
        {
          id: 'f',
          function: 'function',
          componentId: '6',
        },
      ],
      edges: [
        {
          source: 'd',
          target: 'e',
        },
        {
          source: 'e',
          target: 'f',
        },
      ],
    };

    const g3 = {
      nodes: [
        {
          id: 'a',
          function: 'function',
          componentId: '1',
        },
        {
          id: 'b',
          function: 'function',
          componentId: '2',
        },
        {
          id: 'c',
          function: 'function',
          componentId: '3',
        },
        {
          id: 'd',
          function: 'function',
          componentId: '4',
        },
      ],
      edges: [
        {
          source: 'a',
          target: 'b',
        },
        {
          source: 'b',
          target: 'c',
        },
        {
          source: 'c',
          target: 'd',
        },
      ],

    };

    const g4 = {
      nodes: [
        {
          id: 'a',
          function: 'function',
          componentId: '1',
        },
        {
          id: 'b',
          function: 'function',
          componentId: '2',
        },
        {
          id: 'c',
          function: 'function',
          componentId: '3',
        },
        {
          id: 'd',
          function: 'function',
          componentId: '4',
        },
        {
          id: 'e',
          function: 'function',
          componentId: '5',
        },
        {
          id: 'f',
          function: 'function',
          componentId: '6',
        },
      ],
      edges: [
        {
          source: 'a',
          target: 'b',
        },
        {
          source: 'b',
          target: 'c',
        },
        {
          source: 'c',
          target: 'd',
        },
        {
          source: 'd',
          target: 'e',
        },
        {
          source: 'e',
          target: 'f',
        },
      ],

    };

    const g5 = {
      nodes: [
        {
          id: 'a',
          function: 'function',
          componentId: '1',
        },
        {
          id: 'e',
          function: 'function',
          componentId: '5',
        },
        {
          id: 'f',
          function: 'function',
          componentId: '6',
        },
        {
          id: 'g',
          function: 'function',
          componentId: '7',
        },
      ],
      edges: [
        {
          source: 'a',
          target: 'e',
        },
        {
          source: 'e',
          target: 'f',
        },
        {
          source: 'f',
          target: 'g',
        },
      ],

    };

    expect(calculateGraphSimilarity(g1, g1)).toBe(1);
    expect(calculateGraphSimilarity(g1, g2)).toBe(0);
    expect(calculateGraphSimilarity(g1, g3)).toBeCloseTo(0.333);
    expect(calculateGraphSimilarity(g1, g4)).toBeCloseTo(0.333);
    expect(calculateGraphSimilarity(g1, g5)).toBe(0);

    expect(calculateGraphSimilarity(g2, g1)).toBe(0);
    expect(calculateGraphSimilarity(g2, g2)).toBe(1);
    expect(calculateGraphSimilarity(g2, g3)).toBe(0);
    expect(calculateGraphSimilarity(g2, g4)).toBe(1);
    expect(calculateGraphSimilarity(g2, g5)).toBe(0.5);

    expect(calculateGraphSimilarity(g3, g1)).toBeCloseTo(0.333);
    expect(calculateGraphSimilarity(g3, g2)).toBe(0);
    expect(calculateGraphSimilarity(g3, g3)).toBe(1);
    expect(calculateGraphSimilarity(g3, g4)).toBe(1);
    expect(calculateGraphSimilarity(g3, g5)).toBe(0);

    expect(calculateGraphSimilarity(g4, g1)).toBe(0.2);
    expect(calculateGraphSimilarity(g4, g2)).toBe(0.4);
    expect(calculateGraphSimilarity(g4, g3)).toBe(0.6);
    expect(calculateGraphSimilarity(g4, g4)).toBe(1);
    expect(calculateGraphSimilarity(g4, g5)).toBe(0.2);

    expect(calculateGraphSimilarity(g5, g1)).toBe(0);
    expect(calculateGraphSimilarity(g5, g2)).toBeCloseTo(0.333);
    expect(calculateGraphSimilarity(g5, g3)).toBe(0);
    expect(calculateGraphSimilarity(g5, g4)).toBeCloseTo(0.333);
    expect(calculateGraphSimilarity(g5, g5)).toBe(1);
  });
});
