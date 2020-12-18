const fetch = require('node-fetch')
const { services } = require('./config')
const serviceAccounts = require('./data/service-accounts')
const { login } = require('./helper')

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
  const flowRepoBase = `http://localhost:${services.flowRepository.externalPort}`
  const componentRepoBase = `http://localhost:${services.componentRepository.externalPort}`
  const webhooksBase = `http://localhost:${services.webhooks.externalPort}`

  // obtain service account token from default service account (IAM_TOKEN)

  const { username, password } = serviceAccounts.find(
    (account) => account.firstname === 'default'
  )

  const { token } = await login({ username, password })

  const params = new URLSearchParams({ 'page[size]': 1000 })
  const response = await fetch(`${flowRepoBase}/flows?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const flows = (await response.json()).data

  console.log(
    `active: ${flows.filter((flow) => flow.status === 'active').length}`
  )
  console.log(
    `inactive: ${flows.filter((flow) => flow.status === 'inactive').length}`
  )

  const started = {}
  let runTest = true

  for (const flow of flows) {
    if (flow.status === 'inactive' && !flow.cron) {
      await fetch(`${flowRepoBase}/flows/${flow.id}/start`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      runTest = false
    }

    for (const node of flow.graph.nodes) {
      if (!started[node.componentId]) {
        const resp = await fetch(
          `${componentRepoBase}/components/${node.componentId}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        )
        const component = (await resp.json()).data

        if (component.isGlobal && !component.active) {
          await fetch(
            `${componentRepoBase}/components/global/${node.componentId}/start`,
            {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          )
          runTest = false
        }
        started[node.componentId] = true
      }
    }
  }

  let iterations = 0
  let error = 0
  let success = 0
  const max = process.argv[2] ? parseInt(process.argv[2], 10) : 1

  if (runTest) {
    while (iterations < max) {
      for (const flow of flows) {
        fetch(`${webhooksBase}/hook/${flow.id}`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
          .then(() => {
            success++
          })
          .catch(() => {
            error++
          })
          .finally(() => {
            console.log(success, error)
            if (error + success === max) exitHandler()
          })
      }

      iterations++
    }
  } else {
    process.exit(0)
  }

  // get flows
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
