const { execSync } = require('child_process')
const { devToolsRoot, env, dbRoot } = require('./config')

const { checkTools } = require('./helper')

checkTools(['docker', 'docker-compose'])

const proxy = null

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
  // pull db images
  execSync(`cd ${dbRoot} && docker-compose pull`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })

  // pull iam image
  execSync(`cd ${devToolsRoot} && docker-compose pull iam`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })

  process.exit(0)
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
