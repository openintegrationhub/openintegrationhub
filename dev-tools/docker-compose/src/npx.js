const { execSync } = require('child_process')
const path = require('path')

const repositoryRoot = path.resolve(__dirname, '../../../')
const nodeImage = 'node:16-bullseye'

const args = process.argv[2] ? process.argv.splice(2).join(' ') : ''

execSync(
  `docker run --rm --name npmRunner -it -v ${repositoryRoot}:/usr/src/app ${nodeImage} sh -ci 'cd /usr/src/app; npx ${args}'`,
  { stdio: 'inherit' }
)
