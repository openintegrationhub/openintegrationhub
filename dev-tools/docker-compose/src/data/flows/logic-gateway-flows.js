module.exports = [
  {
    name: 'lg-flow1',
    graph: {
      nodes: [
        {
          id: 'step_1',
          componentId: 'test-component',
          function: 'testTrigger',
        },
        {
          id: 'step_2',
          componentId: 'test-component',
          function: 'testAction',
        },
      ],
      edges: [
        {
          source: 'step_1',
          target: 'step_2',
        },
      ],
    },
    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
]
