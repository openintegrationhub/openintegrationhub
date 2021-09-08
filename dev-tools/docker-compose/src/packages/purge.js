const { execSync } = require("child_process")
const { repositoryRoot } = require("../config")

execSync(
  `cd ${repositoryRoot} && sudo find . -name "node_modules" -type d -prune -exec rm -rf '{}' +`,
  { stdio: "inherit" }
)

execSync(
  `cd ${repositoryRoot} && sudo find . -name ".yarn_cache" -type d -prune -exec rm -rf '{}' +`,
  { stdio: "inherit" }
)

execSync(
  `cd ${repositoryRoot} && sudo find . -name ".npm_cache" -type d -prune -exec rm -rf '{}' +`,
  { stdio: "inherit" }
)