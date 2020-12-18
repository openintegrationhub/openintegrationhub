const fetch = require('node-fetch')
const find = require('lodash/find')
const { services } = require('../config')
const { checkTools, waitForStatus, login, setupMinimal } = require('../helper')
const components = require('../data/components')
const flows = require('../data/flows/raw-data-test')
const tenants = require('../data/tenants')

const componentRepositoryBase = `http://localhost:${services.componentRepository.externalPort}`
const flowRepositoryBase = `http://localhost:${services.flowRepository.externalPort}`

let response = null

const componentsCache = {}

async function run() {
  checkTools(['docker-compose', 'mongo'])

  await setupMinimal([
    services.componentRepository,
    services.flowRepository,
    services.scheduler,
    services.webhooks,
    services.componentOrchestrator,
  ])

  await waitForStatus({
    url: `${componentRepositoryBase}/components`,
    status: 401,
  })

  await waitForStatus({
    url: `${flowRepositoryBase}/flows`,
    status: 401,
  })

  for (const component of components) {
    const tenant = find(tenants, {
      users: [{ username: component.owners[0].id }],
    })
    const owner = find(tenant.users, { username: component.owners[0].id })

    // login as owner
    const { token, id } = await login(owner)
    const data = { ...component }

    data.owners = [
      {
        id,
        type: 'user',
      },
    ]

    response = await fetch(`${componentRepositoryBase}/components`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data,
      }),
    })

    if (response.status >= 400) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    const comp = (await response.json()).data
    componentsCache[comp.name] = comp

    console.log(componentsCache)
  }

  for (const flow of flows) {
    const tenant = find(tenants, {
      users: [{ username: flow.owners[0].id }],
    })
    const owner = find(tenant.users, { username: flow.owners[0].id })

    // login as owner
    const { token, id } = await login(owner)
    const data = { ...flow }

    data.owners = [
      {
        id,
        type: 'user',
      },
    ]

    data.graph.nodes = data.graph.nodes.map((node) => ({
      ...node,
      componentId: componentsCache[node.componentId].id,
    }))

    response = await fetch(`${flowRepositoryBase}/flows`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (response.status >= 400) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
  }
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
