module.exports = [
  {
    name: '4xEcho flow',
    graph: {
      nodes: [
        {
          id: 'echo_1',
          componentId: 'Jusup Test Component',
          function: 'echo',
        },
        {
          id: 'echo_2',
          componentId: 'Jusup Test Component',
          function: 'echo',
        },
        {
          id: 'echo_3',
          componentId: 'Jusup Test Component',
          function: 'echo',
        },
        {
          id: 'echo_4',
          componentId: 'Jusup Test Component',
          function: 'echo',
        },
      ],
      edges: [
        {
          source: 'echo_1',
          target: 'echo_2',
        },
        {
          source: 'echo_2',
          target: 'echo_3',
        },
        {
          source: 'echo_2',
          target: 'echo_4',
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
