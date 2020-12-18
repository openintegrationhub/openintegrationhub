module.exports = [
  {
    name: 'Webhook1',
    graph: {
      nodes: [
        {
          id: 'step_1',
          componentId: 'component4',
          function: 'testTrigger',
        },
        {
          id: 'step_2',
          componentId: 'component4',
          function: 'testAction',
          nodeSettings: {
            storeRawRecord: true,
          },
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
