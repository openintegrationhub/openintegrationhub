module.exports = [
  {
    name: 'lg-flow',
    graph: {
      nodes: [
        {
          id: 'step_1',
          componentId: 'dummy',
          function: 'testTrigger',
        },
        {
          id: 'step_2',
          componentId: 'logicGateway',
          function: 'lgAction',
        },
        {
          id: 'step_3',
          componentId: 'dummy',
          function: 'testAction',
        },
        {
          id: 'step_4',
          componentId: 'dummy',
          function: 'testAction',
        },
      ],
      edges: [
        {
          source: 'step_1',
          target: 'step_2',
        },
        {
          source: 'step_2',
          target: 'step_3',
        },
        {
          source: 'step_2',
          target: 'step_4',
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
  {
    name: 'dummy-flow',
    graph: {
      nodes: [
        {
          id: 'step_1',
          componentId: 'dummy',
          function: 'testTrigger',
        },
        {
          id: 'step_2',
          componentId: 'dummy',
          function: 'testAction',
        },
        {
          id: 'step_3',
          componentId: 'dummy',
          function: 'testAction',
        },
      ],
      edges: [
        {
          source: 'step_1',
          target: 'step_2',
        },
        {
          source: 'step_2',
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
