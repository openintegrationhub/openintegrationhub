const cp = require("child_process")
const { nodeVersion, devToolsRoot, repositoryRoot } = require("./config")

cp.execSync(`cd ${devToolsRoot} && docker-compose down`, {
  env: {
    NODE_VERSION: nodeVersion,
    REPOSITORY_ROOT: repositoryRoot,
  },
  stdio: "inherit",
})
