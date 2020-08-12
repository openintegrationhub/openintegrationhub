const { execSync } = require("child_process")
const fetch = require("node-fetch")
const { services } = require("./config")

module.exports = {
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
        const response = await fetch(`http://localhost:${services.iam.port}`)
        if (response.status !== 200) continue
      } catch (err) {
        continue
      }
      break
    }
  },
}
