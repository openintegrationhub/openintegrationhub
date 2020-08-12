const path = require("path")

const repositoryRoot = path.resolve(__dirname, "../../")
const devToolsRoot = path.resolve(__dirname, "../")
const dbRoot = path.resolve(__dirname, "../db")
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
    port: 3001,
    dbName: "iam",
    adminUserName: "admin@local.dev",
    adminPassword: "password",
    serviceUserName: "service@local.dev",
    servicePassword: "password",
  },
}

module.exports = {
  env: {
    NODE_VERSION: nodeVersion,
    HOST_REPOSITORY_ROOT: repositoryRoot,
    HOST_IAM_PORT: services.iam.port,
    DB_IAM: services.iam.dbName,
    DEV_IAM_ADMIN_USERNAME: services.iam.adminUserName,
    DEV_IAM_ADMIN_PASSWORD: services.iam.adminPassword,
  },
  tenants,
  repositoryRoot,
  devToolsRoot,
  dbRoot,
  nodeVersion,
  services,
}
