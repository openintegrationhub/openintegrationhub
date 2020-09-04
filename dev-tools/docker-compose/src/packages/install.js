const cp = require('child_process')
const { repositoryRoot, nodeImage } = require('../config')

cp.execSync(
  `docker run --rm -it -e YARN_CACHE_FOLDER=/usr/src/app/.yarn_cache -v ${repositoryRoot}:/usr/src/app ${nodeImage} sh -ci 'cd /usr/src/app; yarn install --network-timeout 500000'`,
  { stdio: 'inherit' }
)
