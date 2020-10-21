const path = require('path')
const { homedir } = require('os')

const nodeImage = 'node:12-stretch'

const minikubeArgs = '--kubernetes-version=v1.19.0'

const clusterName = 'minikube'

const kubernetesHost = 'https://host.docker.internal:9090'

const repositoryRoot = path.resolve(__dirname, '../../../')
const devToolsRoot = path.resolve(__dirname, '../')
const dbRoot = path.resolve(__dirname, '../db')
const kubeConfigPath = path.resolve(homedir(), '.kube/config')

// service port in containers
const localPort = 3099

// CORS whitelist
const originWhitelist = `http://localhost:3000,0.0.0.0:3001,iam:${localPort}`

const libs = {
  attachmentStorageService: {
    folder: 'attachment-storage-service',
  },
  backendCommonsLib: {
    folder: 'backend-commons-lib',
  },
  cfm: {
    folder: 'cfm',
  },
  componentOrchestrator: {
    folder: 'component-orchestrator',
  },
  componentRepository: {
    folder: 'component-repository',
  },
  eventBus: {
    folder: 'event-bus',
  },
  ferryman: {
    folder: 'ferryman',
  },
  iamUtils: {
    folder: 'iam-utils',
  },
  scheduler: {
    folder: 'scheduler',
  },
  secretService: {
    folder: 'secret-service',
  },
  webhooks: {
    folder: 'webhooks',
  },
}

// services
const services = {
  webUi: {
    port: localPort,
    externalPort: 3000,
    folder: 'web-ui',
  },

  iam: {
    port: localPort,
    externalPort: 3001,
    folder: 'iam',
    db: 'iam',
    adminUsername: 'admin@openintegrationhub.com',
    adminPassword: 'somestring',
  },
  secretService: {
    port: localPort,
    externalPort: 3002,
    folder: 'secret-service',
    db: 'secretService',
  },

  componentRepository: {
    port: localPort,
    externalPort: 3003,
    folder: 'component-repository',
    db: 'componentRepository',
  },

  snapshotsService: {
    port: localPort,
    externalPort: 3004,
    folder: 'snapshots-service',
    db: 'snapshotsService',
  },

  componentOrchestrator: {
    port: localPort,
    externalPort: 3005,
    folder: 'component-orchestrator',
    db: 'componentOrchestrator',
  },

  appDirectory: {
    port: localPort,
    externalPort: 3006,
    folder: 'app-directory',
    db: 'appDirectory',
  },

  attachmentStorageService: {
    port: localPort,
    externalPort: 3007,
    folder: 'attachment-storage-service',
    db: 'attachmentStorageService',
  },

  auditLog: {
    port: localPort,
    externalPort: 3008,
    folder: 'audit-log',
    db: 'auditLog',
  },

  dataHub: {
    port: localPort,
    externalPort: 3009,
    folder: 'data-hub',
    db: 'dataHub',
  },

  dispatcherService: {
    port: localPort,
    externalPort: 3010,
    folder: 'dispatcher-service',
    db: 'dispatcherService',
  },

  flowRepository: {
    port: localPort,
    externalPort: 3011,
    folder: 'flow-repository',
    db: 'flowRepository',
  },

  ils: {
    port: localPort,
    externalPort: 3012,
    folder: 'ils',
    db: 'ils',
  },

  metaDataRepository: {
    port: localPort,
    externalPort: 3013,
    folder: 'meta-data-repository',
    db: 'metaDataRepository',
  },

  scheduler: {
    port: localPort,
    externalPort: 3014,
    folder: 'scheduler',
    db: 'scheduler',
  },

  webhooks: {
    port: localPort,
    externalPort: 3015,
    folder: 'webhooks',
    db: 'webhooks',
  },
  templateRepository: {
    port: localPort,
    externalPort: 3016,
    folder: 'template-repository',
    db: 'templateRepository',
  },
}

function generateEnvs(collection) {
  const envs = {}
  function convert(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()
  }
  Object.entries(collection).forEach((service) => {
    const base = `DEV_${convert(service[0])}`
    Object.entries(service[1]).forEach((entry) => {
      const [key, value] = entry
      envs[`${base}_${convert(key)}`] = value
    })
  })

  return envs
}

module.exports = {
  env: {
    // general
    ORIGIN_WHITELIST: originWhitelist,
    NODE_IMAGE: nodeImage,
    HOST_REPOSITORY_ROOT: repositoryRoot,
    MINIKUBE_HOST_IP: '',
    DEV_IAM_TOKEN: '',
    ...generateEnvs(services),
  },
  clusterName,
  kubernetesHost,
  kubeConfigPath,
  repositoryRoot,
  devToolsRoot,
  dbRoot,
  nodeImage,
  libs,
  services,
  minikubeArgs,
}
