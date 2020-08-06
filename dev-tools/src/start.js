const cp = require("child_process")
const path = require("path")
const { nodeVersion, devToolsRoot, repositoryRoot } = require("./config")
const { checkTools, waitForMongo } = require("./helper")

cp.execSync(`cd ${devToolsRoot} && docker-compose up -V`, {
  env: {
    NODE_VERSION: nodeVersion,
    REPOSITORY_ROOT: repositoryRoot,
  },
  stdio: "inherit",
})

// execSync("cd db/ && docker-compose up -d")
