const path = require("path")
const { homedir } = require("os")

const nodeImage = "node:12-stretch"

const clusterName = "minikube"

const kubernetesHost = "https://host.docker.internal:9090"

const repositoryRoot = path.resolve(__dirname, "../../../")
const devToolsRoot = path.resolve(__dirname, "../")
const dbRoot = path.resolve(__dirname, "../db")
const kubeConfigPath = path.resolve(homedir(), ".kube/config")

const localPort = 3099

// services
const services = {
  webUi: {
    port: localPort,
    externalPort: 3000,
    container: "web-ui",
  },

  iam: {
    port: localPort,
    externalPort: 3001,
    container: "iam",
    db: "iam",
    adminUsername: "admin@openintegrationhub.com",
    adminPassword: "somestring",
  },
  secretService: {
    port: localPort,
    externalPort: 3002,
    container: "secret-service",
    db: "secretService",
  },

  componentRepository: {
    port: localPort,
    externalPort: 3003,
    container: "component-repository",
    db: "componentRepository",
  },

  snapshotsService: {
    port: localPort,
    externalPort: 3004,
    container: "snapshots-service",
    db: "snapshotService",
  },

  componentOrchestrator: {
    port: localPort,
    externalPort: 3005,
    container: "component-orchestrator",
    db: "componentOrchestrator",
  },

  appDirectory: {
    port: localPort,
    externalPort: 3006,
    container: "app-directory",
    db: "appDirectory",
  },

  attachmentStorageService: {
    port: localPort,
    externalPort: 3007,
    container: "attachment-storage",
    db: "attachmentStorageService",
  },

  auditLog: {
    port: localPort,
    externalPort: 3008,
    container: "audit-log",
    db: "auditLog",
  },

  dataHub: {
    port: localPort,
    externalPort: 3009,
    container: "data-hub",
    db: "dataHub",
  },

  dispatcherService: {
    port: localPort,
    externalPort: 3010,
    container: "dispatcher-service",
    db: "dispatcherService",
  },

  flowRepository: {
    port: localPort,
    externalPort: 3011,
    container: "flow-repository",
    db: "flowRepository",
  },

  ils: {
    port: localPort,
    externalPort: 3012,
    container: "ils",
    db: "ils",
  },

  metaDataRepository: {
    port: localPort,
    externalPort: 3013,
    container: "meta-data-repository",
    db: "metaDataRepository",
  },

  scheduler: {
    port: localPort,
    externalPort: 3014,
    container: "scheduler",
    db: "scheduler",
  },

  webhooks: {
    port: localPort,
    externalPort: 3015,
    container: "webhooks",
    db: "webhooks",
  },
}

const originWhitelist = `http://localhost:3000,0.0.0.0:3001,iam:${localPort}`

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
    IP_FROM_MINIKUBE_TO_HOST: "",
    DEV_IAM_TOKEN: "",
    ...generateEnvs(services),
  },
  clusterName,
  kubernetesHost,
  kubeConfigPath,
  repositoryRoot,
  devToolsRoot,
  dbRoot,
  nodeImage,
  services,
}
