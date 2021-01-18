module.exports = [
  {
    distribution: {
      type: 'docker',
      image: 'openintegrationhub/dev-connector:latest',
    },
    isGlobal: true,
    access: 'public',
    name: 'component1',
    description: 'A component just for testing',
    descriptor: {
      replicas: 3,
      imagePullPolicy: 'Always',
    },
    resources: {
      requests: {
        memory: '128Mi',
        cpu: '250m',
      },
      limits: {
        memory: '256Mi',
        cpu: '500m',
      },
    },
    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
  {
    distribution: {
      type: 'docker',
      image: 'openintegrationhub/dev-connector:latest',
    },
    isGlobal: true,
    access: 'public',
    name: 'component2',
    description: 'A component just for testing',
    descriptor: {
      replicas: 3,
      imagePullPolicy: 'Always',
    },
    resources: {
      requests: {
        memory: '128Mi',
        cpu: '250m',
      },
      limits: {
        memory: '256Mi',
        cpu: '500m',
      },
    },
    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
  {
    distribution: {
      type: 'docker',
      image: 'openintegrationhub/dev-connector:latest',
    },
    isGlobal: false,
    access: 'public',
    name: 'component3',
    description: 'A component just for testing',
    descriptor: {
      replicas: 1,
    },
    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
  {
    distribution: {
      type: 'docker',
      image: 'openintegrationhub/dev-connector:simplemessage',
    },
    access: 'public',
    isGlobal: false,
    active: false,
    name: 'simple-message',
    description: 'Just testing something',
    descriptor: {
      triggers: {
        testTrigger: {
          title: 'Spawns a minimal test object',
          description: 'Will provide extensive logging',
          type: 'polling',
        },
      },
      actions: {
        testAction: {
          title: 'Will log whatever data it has received',
          description: 'Does not push anything to any remote endpoint',
        },
      },
    },
    logo: 'https://avatars0.githubusercontent.com/u/29919153?s=200&v=4',
    owners: [{ id: 't1_admin@local.dev', type: 'user' }],
  },

  {
    distribution: {
      type: 'docker',
      image: 'openintegrationhub/code-component:latest',
    },
    access: 'public',
    name: 'code',
    description: 'Node.js code component',
    descriptor: { actions: [], triggers: [] },
    owners: [{ id: 't1_admin@local.dev', type: 'user' }],
    logo: 'https://www.javatpoint.com/js/nodejs/images/node-js-tutorial.png',
    active: false,
    isGlobal: false,
  },
  {
    distribution: {
      type: 'docker',
      image: 'oih/dev-connector:latest',
    },
    isGlobal: false,
    access: 'public',
    name: 'component4',
    description: 'A component just for testing',
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '128Mi',
        cpu: '250m',
      },
      limits: {
        memory: '256Mi',
        cpu: '500m',
      },
    },
    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
  {
    distribution: {
      type: 'docker',
      image: 'oih/dev-connector:latest',
    },
    isGlobal: true,
    access: 'public',
    name: 'component5',
    description: 'A component just for testing',
    descriptor: {
      replicas: 3,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '128Mi',
        cpu: '250m',
      },
      limits: {
        memory: '256Mi',
        cpu: '500m',
      },
    },
    owners: [
      {
        id: 't1_admin@local.dev',
        type: 'user',
      },
    ],
  },
]
