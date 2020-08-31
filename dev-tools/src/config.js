const path = require("path")
const { homedir } = require("os")

const nodeImage = "node:12-stretch"

const clusterName = "minikube"

const kubernetesHost = "https://host.docker.internal:9090"

const originWhitelist = "http://web-ui.iam.oih.dev:3000,0.0.0.0:3001"

const repositoryRoot = path.resolve(__dirname, "../../")
const devToolsRoot = path.resolve(__dirname, "../")
const dbRoot = path.resolve(__dirname, "../db")
const kubeConfigPath = path.resolve(homedir(), ".kube/config")

const localPort = 3099

// services
const services = {
  iam: {
    port: localPort,
    externalPort: 3001,
    dbName: "iam",
    adminUserName: "admin@local.dev",
    adminPassword: "password",
    serviceUserName: "service@local.dev",
    servicePassword: "password",
  },
  secretService: {
    port: localPort,
    externalPort: 3002,
    dbName: "secretService",
  },

  componentRepository: {
    port: localPort,
    externalPort: 3003,
    dbName: "componentRepository",
  },

  snapshotsService: {
    port: localPort,
    externalPort: 3004,
    dbName: "snapshotService",
  },

  componentOrchestrator: {
    port: localPort,
    externalPort: 3005,
    dbName: "componentOrchestrator",
  },

  appDirectory: {
    port: localPort,
    externalPort: 3006,
    dbName: "appDirectory",
  },

  attachmentStorageService: {
    port: localPort,
    externalPort: 3007,
    dbName: "attachmentStorageService",
  },

  auditLog: {
    port: localPort,
    externalPort: 3008,
    dbName: "auditLog",
  },

  dataHub: {
    port: localPort,
    externalPort: 3009,
    dbName: "dataHub",
  },

  dispatcherService: {
    port: localPort,
    externalPort: 3010,
    dbName: "dispatcherService",
  },
}

module.exports = {
  env: {
    // general
    ORIGIN_WHITELIST: originWhitelist,
    NODE_IMAGE: nodeImage,
    HOST_REPOSITORY_ROOT: repositoryRoot,
    IP_FROM_MINIKUBE_TO_HOST: "172.17.0.1",
    // IAM
    DEV_IAM_DB: services.iam.dbName,
    DEV_IAM_PORT: services.iam.port,
    DEV_IAM_EXTERNAL_PORT: services.iam.externalPort,
    DEV_IAM_ADMIN_USERNAME: services.iam.adminUserName,
    DEV_IAM_ADMIN_PASSWORD: services.iam.adminPassword,
    DEV_IAM_TOKEN: "will be replaced",
    // Secret Service
    DEV_SECRET_SERVICE_DB: services.secretService.dbName,
    DEV_SECRET_SERVICE_PORT: services.secretService.port,
    DEV_SECRET_SERVICE_EXTERNAL_PORT: services.secretService.externalPort,
    // Component Repository
    DEV_COMPONENT_REPOSITORY_DB: services.componentRepository.dbName,
    DEV_COMPONENT_REPOSITORY_PORT: services.componentRepository.port,
    DEV_COMPONENT_REPOSITORY_EXTERNAL_PORT:
      services.componentRepository.externalPort,
    // Snapshot Service
    DEV_SNAPSHOTS_SERVICE_DB: services.snapshotsService.dbName,
    DEV_SNAPSHOTS_SERVICE_PORT: services.snapshotsService.port,
    DEV_SNAPSHOTS_SERVICE_EXTERNAL_PORT: services.snapshotsService.externalPort,
    // Component Orchestrator
    DEV_COMPONENT_ORCHESTRATOR_DB: services.componentOrchestrator.dbName,
    DEV_COMPONENT_ORCHESTRATOR_PORT: services.componentOrchestrator.port,
    DEV_COMPONENT_ORCHESTRATOR_EXTERNAL_PORT:
      services.componentOrchestrator.externalPort,
    // App Directory
    DEV_APP_DIRECTORY_DB: services.appDirectory.dbName,
    DEV_APP_DIRECTORY_PORT: services.appDirectory.port,
    DEV_APP_DIRECTORY_EXTERNAL_PORT: services.appDirectory.externalPort,
    // Attachment Storage Service
    DEV_ATTACHMENT_STORAGE_SERVICE_DB: services.attachmentStorageService.dbName,
    DEV_ATTACHMENT_STORAGE_SERVICE_PORT: services.attachmentStorageService.port,
    DEV_ATTACHMENT_STORAGE_SERVICE_EXTERNAL_PORT:
      services.attachmentStorageService.externalPort,
    // Audit Log
    DEV_AUDIT_LOG_DB: services.auditLog.dbName,
    DEV_AUDIT_LOG_PORT: services.auditLog.port,
    DEV_AUDIT_LOG_EXTERNAL_PORT: services.auditLog.externalPort,
    // data Hub
    DEV_DATA_HUB_DB: services.dataHub.dbName,
    DEV_DATA_HUB_PORT: services.dataHub.port,
    DEV_DATA_HUB_EXTERNAL_PORT: services.dataHub.externalPort,
    // Dispatcher Service
    DEV_DISPATCHER_SERVICE_DB: services.dataHub.dbName,
    DEV_DISPATCHER_SERVICE_PORT: services.dataHub.port,
    DEV_DISPATCHER_SERVICE_EXTERNAL_PORT: services.dataHub.externalPort,
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
