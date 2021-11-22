const { spawn } = require('child_process')
const {
  checkTools,
  getMinikubeClusterIp,
  getMinikubeInternalIp,
} = require('./helper')

checkTools(['minikube', 'simpleproxy'])

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
  const clusterIpPort = getMinikubeClusterIp()

  console.log('Starting proxy')
  proxy = spawn('simpleproxy', ['-L', '9090', '-R', clusterIpPort])
  console.log('Proxy started')
  console.log(`Minikube: External Cluster IP ${getMinikubeClusterIp()}`)
  console.log(`Minikube: Internal Host IP ${getMinikubeInternalIp()}`)
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
