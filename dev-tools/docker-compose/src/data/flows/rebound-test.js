module.exports = [
  {
    name: 'rebound-local',
    graph: {
      nodes: [
        {
          id: 'trigger',
          componentId: 'rebound-component-local',
          function: 'reboundTrigger',
        },
      ],
      edges: [],
    },

    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
  {
    name: 'rebound-global',
    graph: {
      nodes: [
        {
          id: 'trigger',
          componentId: 'rebound-component-global',
          function: 'reboundTrigger',
        },
      ],
      edges: [],
    },

    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
]
