module.exports = [
  {
    distribution: {
      type: 'docker',
      image: 'oih/connector:latest',
    },
    isGlobal: true,
    access: 'public',
    name: 'component1',
    description: 'A component just for testing',
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '250m',
      },
      limits: {
        memory: '128Mi',
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
      image: 'oih/connector:latest',
    },
    isGlobal: true,
    access: 'public',
    name: 'component2',
    description: 'A component just for testing',
    descriptor: {
      replicas: 1,
      imagePullPolicy: 'Never',
    },
    resources: {
      requests: {
        memory: '64Mi',
        cpu: '250m',
      },
      limits: {
        memory: '128Mi',
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
]
