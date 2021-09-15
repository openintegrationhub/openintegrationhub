const path = require('path')
const cp = require('child_process')

const repositoryRoot = path.resolve(__dirname, '../../../../')
const nodeImage = 'node:16-bullseye'
cp.execSync(
  `docker run --rm -it -e npm_config_cache=/usr/src/app/.npm_cache -v ${repositoryRoot}:/usr/src/app ${nodeImage} sh -ci 'cd /usr/src/app; npm i'`,
  { stdio: 'inherit' }
)
