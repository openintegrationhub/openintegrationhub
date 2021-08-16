module.exports = [
  {
    name: 'logic-gateway-flow',
    graph: {
      nodes: [
        {
          id: 'trigger',
          componentId: 'test-component-local',
          function: 'testTrigger',
        },
        {
          id: 'logic_gateway',
          componentId: 'logicGateway',
          function: 'exec',
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
                      stepId: 'trigger',
                      field: 'username',
                    },
                  },
                  value: {
                    type: 'string',
                    data: 'Bert Meier',
                  },
                },
              ],
              actions: {
                positive: {
                  command: 'run-next-steps',
                  parameters: ['123:positive'],
                },
                negative: {
                  command: 'run-next-steps',
                  parameters: ['123:negative'],
                },
              },
            },
          },
        },
        {
          id: 'positive',
          componentId: 'test-component-local',
          function: 'testAction',
        },
        {
          id: 'negative',
          componentId: 'test-component-local',
          function: 'testAction',
        },
      ],
      edges: [
        {
          source: 'trigger',
          target: 'logic_gateway',
        },
        {
          source: 'logic_gateway',
          target: 'positive',
        },
        {
          source: 'logic_gateway',
          target: 'negative',
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
