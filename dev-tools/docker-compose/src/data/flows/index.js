module.exports = [
  {
    name: 'Message Format test',
    graph: {
      nodes: [
        {
          id: 'step_1',
          componentId: 'simple-message',
          function: 'testTrigger',
          nodeSettings: {
            storeRawData: true,
          },
        },
        {
          id: 'step_2',
          componentId: 'code',
          function: 'execute',
          fields: {
            code:
              "function* run() {console.log('Calling external URL');yield request.post({uri: 'https://webhook.site/37506d95-1293-4323-8ad8-b0c7834c0ca9', body: msg, json: true});}",
          },
        },
      ],
      edges: [{ source: 'step_1', target: 'step_2' }],
    },
    cron: '* * * * *',
    owners: [{ id: 't1_admin@local.dev', type: 'user' }],
  },

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
]
