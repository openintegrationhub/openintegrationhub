const { execSync } = require('child_process')

const {
  repositoryRoot,
  dbRoot,
  nodeImage,
  libs,
  services,
  env,
} = require('./config')

const testEnvs = Object.entries({
  // following envs will be applied to every "npm test" command
  MONGODB_URI: 'mongodb://mongodb/testing',
  BINARY_DOWNLOAD_DIR: '/usr/src/app/.mongo_binaries',
  CI: 'true',
  REDIS_CONFIG: `"${JSON.stringify({
    host: 'redis',
    keyPrefix: 'maester_test:',
    sentinels: null,
  }).replace(/"/g, '\\"')}"`,
  /// ////
}).reduce((a, b) => {
  if (Array.isArray(a)) return `${a[0]}=${a[1]}  ${b[0]}=${b[1]}`
  return `${a} ${b[0]}=${b[1]}`
})

const prepareFullTest = () => `docker pull ${nodeImage}`

const testCommand = (workspace, args) =>
  `docker run \
  --name oih-testing \
  --net=oih-dev \
  --rm \
  -it \
  -v ${repositoryRoot}:/usr/src/app \
  ${nodeImage} \
  sh -ci 'cd /usr/src/app; ${testEnvs} npm --workspace=${workspace} test ${
    args || ''
  }'`

// ensure dbs
execSync(`cd ${dbRoot} && docker-compose up -d`, {
  env: {
    ...process.env,
    ...env,
  },
  stdio: 'inherit',
})

if (process.argv[2]) {
  const [, , selected, tArgs] = process.argv

  console.log(`Testing ${selected}`)
  execSync(testCommand(selected, tArgs), {
    stdio: 'inherit',
  })
  process.exit(0)
}

// prepare testing

execSync(prepareFullTest(), {
  stdio: 'inherit',
})

// test libs
Object.entries(libs).forEach((entry) => {
  const [key, lib] = entry
  console.log(`Testing lib ${key}`)
  execSync(testCommand(`lib/${lib.folder}`), {
    stdio: 'inherit',
  })
})

// test services
Object.entries(services).forEach((entry) => {
  const [key, service] = entry
  console.log(`Testing service ${key}`)
  execSync(testCommand(`services/${service.folder}`), {
    stdio: 'inherit',
  })
})
