module.exports = [
  {
    name: 'Webhook1',
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
          nodeSettings: {},
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
