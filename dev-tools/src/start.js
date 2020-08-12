const cp = require("child_process")
const path = require("path")
const { devToolsRoot, env } = require("./config")
const { checkTools, waitForMongo } = require("./helper")

checkTools(["docker-compose"])

cp.execSync(`cd ${path.resolve(__dirname, "../db")} && docker-compose up -d`)

waitForMongo()

cp.execSync(`cd ${devToolsRoot} && docker-compose up -V`, {
  env,
  stdio: "inherit",
})
