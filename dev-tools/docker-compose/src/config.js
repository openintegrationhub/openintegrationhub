require('dotenv').config()
const path = require('path')
const { homedir } = require('os')

const orchestratorReplica = 1
const nodeImage = 'node:16-bullseye'
const kubernetesVersion = 'v1.22.4'

const adminUsername = 'admin@openintegrationhub.com'
const adminPassword = 'somestring'

const minikubeArgs = `--kubernetes-version=${kubernetesVersion} --mount`
const fullComposeArgs = `-V --remove-orphans --scale component-orchestrator=${orchestratorReplica}`

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
    adminUsername,
    adminPassword,
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
    // define port range for vertical scaling
    externalPort: '3005-3008',
    folder: 'component-orchestrator',
    db: 'componentOrchestrator',
  },

  appDirectory: {
    port: localPort,
    externalPort: 3009,
    folder: 'app-directory',
    db: 'appDirectory',
  },

  attachmentStorageService: {
    port: localPort,
    externalPort: 3010,
    folder: 'attachment-storage-service',
    db: 'attachmentStorageService',
  },

  auditLog: {
    port: localPort,
    externalPort: 3011,
    folder: 'audit-log',
    db: 'auditLog',
  },

  dataHub: {
    port: localPort,
    externalPort: 3012,
    folder: 'data-hub',
    db: 'dataHub',
  },

  dispatcherService: {
    port: localPort,
    externalPort: 3013,
    folder: 'dispatcher-service',
    db: 'dispatcherService',
  },

  flowRepository: {
    port: localPort,
    externalPort: 3014,
    folder: 'flow-repository',
    db: 'flowRepository',
  },

  ils: {
    port: localPort,
    externalPort: 3015,
    folder: 'ils',
    db: 'ils',
  },

  metaDataRepository: {
    port: localPort,
    externalPort: 3016,
    folder: 'meta-data-repository',
    db: 'metaDataRepository',
  },

  scheduler: {
    port: localPort,
    externalPort: 3017,
    folder: 'scheduler',
    db: 'scheduler',
  },

  webhooks: {
    port: localPort,
    externalPort: 3018,
    folder: 'webhooks',
    db: 'webhooks',
  },
  templateRepository: {
    port: localPort,
    externalPort: 3019,
    folder: 'template-repository',
    db: 'templateRepository',
  },
  rds: {
    port: localPort,
    externalPort: 3020,
    folder: 'rds',
    db: 'rds',
  },
  governanceService: {
    port: localPort,
    externalPort: 3021,
    folder: 'governance-service',
    db: 'governance-service',
  },
  reportsAnalytics: {
    port: localPort,
    externalPort: 3022,
    folder: 'reports-analytics',
    db: 'reports-analytics',
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
    KUBERNETES_VOLUME_HOSTPATH_ENABLED:
      process.env.KUBERNETES_VOLUME_HOSTPATH_ENABLED,
    KUBERNETES_VOLUME_HOSTPATH_PATH:
      process.env.KUBERNETES_VOLUME_HOSTPATH_PATH,
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
  fullComposeArgs,
}
