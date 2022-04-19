module.exports = [
  {
    name: 'logic-gateway-flow',
    graph: {
      nodes: [
        {
          id: 'trigger',
          componentId: 'test-component',
          function: 'testTrigger',
        },
        {
          id: 'logic_gateway',
          componentId: 'logicGateway-global',
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
                      stepId: 'trigger',
                      field: 'username',
                    },
                  },
                  value: {
                    type: 'string',
                    data: 'Bert Müller',
                  },
                },
              ],
              actions: {
                positive: {
                  command: 'run-next-steps',
                  parameters: ['positive'],
                },
                negative: {
                  command: 'run-next-steps',
                  parameters: ['negative'],
                },
              },
            },
          },
        },
        {
          id: 'positive',
          componentId: 'test-component',
          function: 'testAction',
        },
        {
          id: 'negative',
          componentId: 'test-component',
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
  {
    name: 'logic-gateway-flow-lg-image',
    graph: {
      nodes: [
        {
          id: 'trigger',
          componentId: 'test-component',
          function: 'testTrigger',
        },
        {
          id: 'logic_gateway',
          componentId: 'logicGateway-global-lg-image',
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
                      stepId: 'trigger',
                      field: 'username',
                    },
                  },
                  value: {
                    type: 'string',
                    data: 'Bert Müller',
                  },
                },
              ],
              actions: {
                positive: {
                  command: 'run-next-steps',
                  parameters: ['positive'],
                },
                negative: {
                  command: 'run-next-steps',
                  parameters: ['negative'],
                },
              },
            },
          },
        },
        {
          id: 'positive',
          componentId: 'test-component',
          function: 'testAction',
        },
        {
          id: 'negative',
          componentId: 'test-component',
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
