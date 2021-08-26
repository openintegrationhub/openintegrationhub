const { execSync } = require('child_process')
const path = require('path')

const nodeImage = 'node:12-bullseye'
const repositoryRoot = path.resolve(__dirname, '../../../')

const yarnArgs = process.argv[2]
  ? process.argv.slice(2).reduce((a, b) => `${a} ${b}`)
  : ''

execSync(
  `docker run --rm -it -e YARN_CACHE_FOLDER=/usr/src/app/.yarn_cache -v ${repositoryRoot}:/usr/src/app ${nodeImage} sh -ci 'cd /usr/src/app; yarn ${yarnArgs}'`,
  { stdio: 'inherit' }
)
