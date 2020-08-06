const { execSync } = require("child_process")

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
    while (true) {
      try {
        execSync('mongo --eval "db.getCollectionNames()"')
      } catch (err) {
        console.log("Waiting for MongoDB")
        continue
      }
      break
    }
  },
  async waitForRedis() {},
  async waitForRabbitMq() {},
}
