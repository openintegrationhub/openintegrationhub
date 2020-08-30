const { execSync } = require("child_process")
const fetch = require("node-fetch")
const fs = require("fs")
const YAML = require("yaml")
const { services, kubeConfigPath, clusterName } = require("./config")

const iamBase = `http://localhost:${services.iam.externalPort}`

module.exports = {
  readKubeConfig() {
    const file = fs.readFileSync(kubeConfigPath, "utf8")

    if (!file) {
      throw new Error(`Kubernetes config not found in ${kubeConfigPath}`)
    }

    return YAML.parse(file)
  },

  getMinikubeClusterIp() {
    const config = module.exports.readKubeConfig()
    const minikubeConfig = config.clusters.filter(
      (item) => item.name === clusterName
    )[0]

    return minikubeConfig.cluster.server
  },
  async getAccountToken(username, password) {
    const response = await fetch(`${iamBase}/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })

    if (response.status !== 200) {
      throw new Error("Account missing")
    }

    const { token } = await response.json()
    return token
  },

  checkTools(tools = []) {
    for (const tool of tools) {
      try {
        execSync(`type ${tool}`)
      } catch (err) {
        console.error(`${tool} not available. Please install first`)
      }
    }
  },
  waitForMongo() {
    console.log("Waiting for MongoDB")
    while (true) {
      try {
        execSync('mongo --eval "db.getCollectionNames()"')
      } catch (err) {
        continue
      }
      break
    }
  },
  async waitForIAM() {
    console.log("Waiting for IAM")
    while (true) {
      try {
        const response = await fetch(iamBase)
        if (response.status !== 200) continue
      } catch (err) {
        continue
      }
      break
    }
  },
}
