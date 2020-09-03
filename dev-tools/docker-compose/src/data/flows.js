module.exports = [
  {
    name: 'Concurrent Webhook',
    graph: {
      nodes: [
        {
          id: 'step_1',
          componentId: 'component1',
          function: 'testTrigger',
        },
        {
          id: 'step_2',
          componentId: 'component2',
          function: 'testAction',
        },
        {
          id: 'step_3',
          componentId: 'component2',
          function: 'testAction',
        },
      ],
      edges: [
        {
          source: 'step_1',
          target: 'step_2',
        },
        {
          source: 'step_1',
          target: 'step_3',
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
