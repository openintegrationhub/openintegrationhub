const fetch = require('node-fetch')
const { services } = require('./config')
const serviceAccounts = require('./data/service-accounts')
const { waitForStatus, login, checkTools } = require('./helper')

checkTools([
  'docker',
  'docker-compose',
  'minikube',
  'mongo',
  'minikube',
  'simpleproxy',
])

process.stdin.resume() // so the program will not close instantly

function exitHandler() {
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
  const iamBase = `http://localhost:${services.iam.externalPort}`
  const flowRepoBase = `http://localhost:${services.flowRepository.externalPort}`
  const webhooksBase = `http://localhost:${services.webhooks.externalPort}`
  await waitForStatus({ url: iamBase, status: 200 })

  // obtain service account token from default service account (IAM_TOKEN)

  const { username, password } = serviceAccounts.find(
    (account) => account.firstname === 'default'
  )

  const { token } = await login({ username, password })

  const response = await fetch(`${flowRepoBase}/flows`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const flows = (await response.json()).data
  //   console.log(flows)
  //   for (const flow of flows) {
  //     await fetch(`${flowRepoBase}/flows/${flow.id}/start`, {
  //       method: 'POST',
  //       headers: {
  //         Accept: 'application/json',
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${token}`,
  //       },
  //     })
  //   }

  setInterval(() => {
    flows.forEach((flow) => {
      fetch(`${webhooksBase}/hook/${flow.id}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    })
  }, 5000)

  // get flows
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
