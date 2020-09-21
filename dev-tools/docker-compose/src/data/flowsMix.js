module.exports = [
  {
    name: 'Webhook1',
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
          componentId: 'component3',
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
  {
    name: 'Webhook2',
    graph: {
      nodes: [
        {
          id: 'step_1',
          componentId: 'component3',
          function: 'testTrigger',
        },
        {
          id: 'step_2',
          componentId: 'component3',
          function: 'testAction',
        },
        {
          id: 'step_3',
          componentId: 'component3',
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
  {
    name: 'Webhook3',
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
