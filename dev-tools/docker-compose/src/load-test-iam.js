const { services } = require('./config')
const serviceAccounts = require('./data/service-accounts')
const { login } = require('./helper')

// async function wait(ms) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms)
//   })
// }

process.stdin.resume() // so the program will not close instantly

function exitHandler() {
  process.exit(0)
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
  const iamBase = `http://localhost:${services.iam.externalPort}/api/v1`

  // obtain service account token from default service account (IAM_TOKEN)

  const { username, password } = serviceAccounts.find(
    (account) => account.firstname === 'default'
  )

  process.env.INTROSPECT_ENDPOINT_BASIC = `${iamBase}/tokens/introspect`
  process.env.IAM_BASE_URL = iamBase
  // process.env.IAM_TOKEN = token
  process.env.INTROSPECT_TYPE = 'basic'

  // const iamUtils = require('@openintegrationhub/iam-utils') // eslint-disable-line global-require

  let iterations = 0
  let error = 0
  let success = 0
  const max = process.argv[2] ? parseInt(process.argv[2], 10) : 1

  while (iterations < max) {
    login({ username, password })
      .then(() => success++)
      .catch(() => error++)
      .finally(() => {
        console.log(success, error)
        if (error + success === max) exitHandler()
      })
    // iamUtils
    //   .getUserData({ token: v1() })
    //   .then(() => success++)
    //   .catch(() => error++)
    //   .finally(() => {
    //     console.log(success, error)
    //     if (error + success === max) exitHandler()
    //   })
    iterations++
  }

  // get flows
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
    exitHandler()
  }
})()
