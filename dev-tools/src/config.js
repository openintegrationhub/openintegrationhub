const path = require("path")

const repositoryRoot = path.resolve(__dirname, "../../")
const devToolsRoot = path.resolve(__dirname, "../")
const dbRoot = path.resolve(__dirname, "../db")

const originWhitelist = "http://web-ui.iam.oih.dev:3000"

const nodeVersion = "12"

const tenants = [
  {
    name: "tenant1",
    confirmed: true,
    status: "ACTIVE",
    users: [
      {
        status: "ACTIVE",
        confirmed: true,
        role: "TENANT_ADMIN",
        permissions: ["all"],
        username: "t1_admin@local.dev",
        password: "password",
      },
    ],
  },
]

// services
const services = {
  iam: {
    port: 3099,
    externalPort: 3001,
    dbName: "iam",
    adminUserName: "admin@local.dev",
    adminPassword: "password",
    serviceUserName: "service@local.dev",
    servicePassword: "password",
  },
  secretService: {
    port: 3099,
    externalPort: 3002,
    dbName: "secretService",
  },

  componentRepository: {
    port: 3099,
    externalPort: 3003,
    dbName: "componentRepository",
  },

  snapshotsService: {
    port: 3099,
    externalPort: 3004,
    dbName: "snapshotService",
  },

  componentOrchestrator: {
    port: 3099,
    externalPort: 3005,
    dbName: "componentOrchestrator",
  },
}

module.exports = {
  env: {
    // general
    ORIGIN_WHITELIST: originWhitelist,
    NODE_VERSION: nodeVersion,
    HOST_REPOSITORY_ROOT: repositoryRoot,
    IP_FROM_MINIKUBE_TO_HOST: "172.17.0.1",
    // IAM
    DB_IAM: services.iam.dbName,
    DEV_IAM_PORT: services.iam.port,
    DEV_IAM_EXTERNAL_PORT: services.iam.externalPort,
    DEV_IAM_ADMIN_USERNAME: services.iam.adminUserName,
    DEV_IAM_ADMIN_PASSWORD: services.iam.adminPassword,
    DEV_IAM_TOKEN: "will be replaced",
    // Secret Service
    DB_SECRET_SERVICE: services.secretService.dbName,
    DEV_SECRET_SERVICE_PORT: services.secretService.port,
    DEV_SECRET_SERVICE_EXTERNAL_PORT: services.secretService.externalPort,
    // Component Repository
    DB_COMPONENT_REPOSITORY: services.componentRepository.dbName,
    DEV_COMPONENT_REPOSITORY_PORT: services.componentRepository.port,
    DEV_COMPONENT_REPOSITORY_EXTERNAL_PORT:
      services.componentRepository.externalPort,
    // Snapshot Service
    DB_SNAPSHOTS_SERVICE: services.snapshotsService.dbName,
    DEV_SNAPSHOTS_SERVICE_PORT: services.snapshotsService.port,
    DEV_SNAPSHOTS_SERVICE_EXTERNAL_PORT: services.snapshotsService.externalPort,
    // Component Orchestrator
    DB_COMPONENT_ORCHESTRATOR: services.componentOrchestrator.dbName,
    DEV_COMPONENT_ORCHESTRATOR_PORT: services.componentOrchestrator.port,
    DEV_COMPONENT_ORCHESTRATOR_EXTERNAL_PORT:
      services.componentOrchestrator.externalPort,
  },
  tenants,
  repositoryRoot,
  devToolsRoot,
  dbRoot,
  nodeVersion,
  services,
}
