const cp = require("child_process")
const { repositoryRoot } = require("../config")

cp.execSync(
  `cd ${repositoryRoot} && sudo find . -name "node_modules" -type d -prune -exec rm -rf '{}' +`,
  { stdio: "inherit" }
)
