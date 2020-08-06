const cp = require("child_process")
const path = require("path")
const { repositoryRoot, nodeVersion } = require("./config")
const { checkTools, waitForMongo } = require("./helper")

checkTools(["docker", "docker-compose", "mongo"])

cp.execSync(`cd ${path.resolve(__dirname, "../db")} && docker-compose up -d`)
waitForMongo()

cp.execSync(
  `cd ${path.resolve(
    __dirname,
    "../db"
  )} && docker run --rm -it -e YARN_CACHE_FOLDER=/usr/src/app/.yarn_cache -v ${repositoryRoot}:/usr/src/app:cached node:${nodeVersion} bash -ci 'cd /usr/src/app; yarn install --network-timeout 500000'`,
  { stdio: "inherit" }
)

// execSync("cd db/ && docker-compose up -d")
