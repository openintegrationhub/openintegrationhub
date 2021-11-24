const { execSync, spawn } = require('child_process')
const {
  devToolsRoot,
  env,
  dbRoot,
  services,
  minikubeArgs,
  fullComposeArgs,
} = require('./config')
const serviceAccounts = require('./data/service-accounts')
const {
  waitForStatus,
  waitForMongo,
  login,
  getUserInfo,
  createPersistentToken,
  checkTools,
  getMinikubeClusterIp,
  getMinikubeInternalIp,
} = require('./helper')

checkTools(['docker', 'docker-compose', 'minikube', 'mongo', 'simpleproxy'])

let proxy = null

process.stdin.resume() // so the program will not close instantly

function exitHandler() {
  if (proxy) {
    console.log('kill proxy')
    proxy.kill('SIGTERM')
  }
  process.exit()
}

// do something when app is closing
process.on('exit', exitHandler.bind(null))

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null))

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null))
process.on('SIGUSR2', exitHandler.bind(null))

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null))

async function run() {
  execSync(`minikube start ${minikubeArgs}`, {
    stdio: 'inherit',
  })

  execSync(`minikube addons enable ingress`, {
    stdio: 'inherit',
  })

  execSync(`minikube addons enable dashboard`, {
    stdio: 'inherit',
  })

  execSync(`minikube addons enable metrics-server`, {
    stdio: 'inherit',
  })

  execSync(`cd ${dbRoot} && docker-compose up -d`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })

  waitForMongo()

  // start iam
  execSync(`cd ${devToolsRoot} && docker-compose up -d iam`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })

  const iamBase = `http://localhost:${services.iam.externalPort}`

  await waitForStatus({ url: iamBase, status: 200 })

  // obtain service account token from default service account (IAM_TOKEN)

  const { username, password } = serviceAccounts.find(
    (account) => account.firstname === 'default'
  )

  const { token } = await login({ username, password })
  const userData = await getUserInfo(token)
  console.log(userData)
  // create a single persistent token used for every service

  const tokenResp = await createPersistentToken({
    token,
    accountId: userData._id,
  })

  // start proxy to kubernetes cluster

  const clusterIpPort = getMinikubeClusterIp()
  const minikubeHostIp = getMinikubeInternalIp()

  proxy = spawn('simpleproxy', ['-L', '9090', '-R', clusterIpPort])

  // start specific containers obtained by argument
  const container = process.argv[2] || ''

  execSync(
    `cd ${devToolsRoot} && COMPOSE_PARALLEL_LIMIT=1000 docker-compose up ${fullComposeArgs} ${container}`,
    {
      env: {
        ...process.env,
        ...env,
        DEV_IAM_TOKEN: tokenResp.token,
        MINIKUBE_HOST_IP: minikubeHostIp,
      },
      stdio: 'inherit',
    }
  )
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
