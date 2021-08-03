module.exports = [
  {
    name: 'lg-test-flow',
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
          function: 'processStep',
          nodeSettings: {
            devMode: true,
          },
          fields: {
            rule: {
              type: 'CONDITION',
              subtype: 'AND',
              operands: [
                {
                  type: 'operation',
                  operation: 'EQUALS',
                  key: {
                    type: 'ref',
                    data: {
                      flowId: 123,
                      stepId: 'step_1',
                      field: 'username',
                    },
                  },
                  value: {
                    type: 'string',
                    data: 'Some LG Data',
                  },
                },
              ],
              actions: {
                positive: {
                  command: 'run-next-steps',
                  parameters: ['123:step_3'],
                },
                negative: {
                  command: 'run-next-steps',
                  parameters: ['123:step_4'],
                },
              },
            },
          },
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
  // {
  //   name: 'dummy-flow',
  //   graph: {
  //     nodes: [
  //       {
  //         id: 'step_1',
  //         componentId: 'dummy',
  //         function: 'testTrigger',
  //       },
  //       {
  //         id: 'step_2',
  //         componentId: 'dummy',
  //         function: 'testAction',
  //       },
  //       {
  //         id: 'step_3',
  //         componentId: 'dummy',
  //         function: 'testAction',
  //       },
  //     ],
  //     edges: [
  //       {
  //         source: 'step_1',
  //         target: 'step_2',
  //       },
  //       {
  //         source: 'step_2',
  //         target: 'step_3',
  //       },
  //     ],
  //   },

  //   owners: [
  //     {
  //       id: 't1_admin@local.dev',
  //       type: 'user',
  //     },
  //   ],
  // },
]
