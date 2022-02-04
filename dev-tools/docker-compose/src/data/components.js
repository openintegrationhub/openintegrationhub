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
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
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

  /// / Logic Gateway Testing
  {
    distribution: {
      type: 'docker',
      image: 'oih/test-component:latest',
    },
    isGlobal: false,
    specialFlags: {
      privilegedComponent: true,
    },
    access: 'public',
    name: 'logicGateway',
    description: 'This is an example logic gateway component',
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
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
      image: 'oih/test-component:latest',
    },
    isGlobal: true,
    specialFlags: {
      privilegedComponent: true,
    },
    access: 'public',
    name: 'logicGateway-global',
    description: 'This is an example logic gateway component',
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
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
      image: 'openintegrationhub/logic-gateway-component:latest',
    },
    isGlobal: true,
    specialFlags: {
      privilegedComponent: true,
    },
    access: 'public',
    name: 'logicGateway-global-lg-image',
    description: 'This is an example logic gateway component',
    descriptor: {
      replicas: 1,
      actions: {
        exec: {
          title: 'exec',
          description: 'Execute a predefined logic for a step',
        },
      },
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
      },
    },
    logo:
      'https://game-icons.net/icons/ffffff/000000/1x1/delapouite/logic-gate-or.png',
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
      image: 'oih/test-component:latest',
    },
    isGlobal: true,
    access: 'public',
    name: 'test-component',
    description:
      "This is a special component. It's source lives in dev-tools/test-component. In comparison to a regular component you can NOT use the docker image without mounting in this repository.",
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
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
      image: 'oih/test-component:latest',
    },
    isGlobal: false,
    access: 'public',
    name: 'test-component-local',
    description:
      "This is a special component. It's source lives in dev-tools/test-component. In comparison to a regular component you can NOT use the docker image without mounting in this repository.",
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
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
      image: 'oih/test-component:latest',
    },
    isGlobal: false,
    access: 'public',
    name: 'rebound-component-local',
    description: 'Just emits a rebound message',
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
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
      image: 'oih/test-component:latest',
    },
    isGlobal: true,
    access: 'public',
    name: 'rebound-component-global',
    description: 'Just emits a rebound message',
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '125m',
      },
      limits: {
        memory: '128Mi',
        cpu: '250m',
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
