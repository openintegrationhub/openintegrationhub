const { execSync } = require('child_process')
const path = require('path')

const repositoryRoot = path.resolve(__dirname, '../../../')
const nodeImage = 'node:16-bullseye'

const args = process.argv[2] ? process.argv.splice(2).join(' ') : ''

execSync(
  `docker pull ${nodeImage} && \
  docker run \
  --rm \
  --name npmRunner \
  -it \
  -e npm_config_cache=/usr/src/app/.npm_cache \
  -v ${repositoryRoot}:/usr/src/app \
  ${nodeImage} \
  sh -ci 'cd /usr/src/app; npm ${args}'`,
  { stdio: 'inherit' }
)
