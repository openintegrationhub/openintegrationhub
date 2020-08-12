const cp = require("child_process")
const { repositoryRoot, nodeVersion } = require("../config")
const { checkTools } = require("../helper")

checkTools(["docker"])

cp.execSync(
  `docker run --rm -it -e YARN_CACHE_FOLDER=/usr/src/app/.yarn_cache -v ${repositoryRoot}:/usr/src/app:cached node:${nodeVersion} bash -ci 'cd /usr/src/app; yarn install --network-timeout 500000'`,
  { stdio: "inherit" }
)
