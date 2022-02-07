const fetch = require('node-fetch')
const find = require('lodash/find')
const { services } = require('../config')
const {
  checkTools,
  waitForStatus,
  login,
  setupMinimal,
  getUserInfo,
} = require('../helper')
const components = require('../data/components')
const flows = require('../data/flows/raw-data-test')
const tenants = require('../data/tenants')

const componentRepositoryBase = `http://localhost:${services.componentRepository.externalPort}`
const flowRepositoryBase = `http://localhost:${services.flowRepository.externalPort}`

let response = null

const ownerCache = {}
const componentsCache = {}
const flowCache = {}

async function run() {
  checkTools(['docker-compose', 'mongo'])

  await setupMinimal([services.componentRepository, services.flowRepository])

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

    let token = null
    let userData = null

    // login as owner

    if (ownerCache[owner.username]) {
      token = ownerCache[owner.username].token
      userData = ownerCache[owner.username].userData
    } else {
      token = (await login(owner)).token
      userData = await getUserInfo(token)
      ownerCache[owner.username] = {
        token,
        userData,
      }
    }

    const data = { ...component }

    data.owners = [
      {
        id: userData._id,
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
      body: JSON.stringify(data),
    })

    if (response.status >= 400) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    const comp = (await response.json()).data
    componentsCache[comp.name] = comp
  }

  for (const flow of flows) {
    const tenant = find(tenants, {
      users: [{ username: flow.owners[0].id }],
    })
    const owner = find(tenant.users, { username: flow.owners[0].id })

    let token = null
    let userData = null

    // login as owner

    if (ownerCache[owner.username]) {
      token = ownerCache[owner.username].token
      userData = ownerCache[owner.username].userData
    } else {
      token = (await login(owner)).token
      userData = await getUserInfo(token)
    }

    const data = { ...flow }

    data.owners = [
      {
        id: userData._id,
        type: 'user',
      },
    ]

    data.graph.nodes = data.graph.nodes.map((node) => ({
      ...node,
      componentId: componentsCache[node.componentId].id,
    }))

    data.tenant = userData.tenant

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

    const flowData = (await response.json()).data
    flowCache[flowData.id] = flowData
  }

  const flowRefRegex = new RegExp(/\$flow_ref\((.+)\)/)
  // logic-gateway: replace flow references in every flow
  for (const [flowId, flowData] of Object.entries(flowCache)) {
    for (let i = 0; i < flowData.graph.nodes.length; i++) {
      const node = flowData.graph.nodes[i]
      if (node.fields && node.fields.rule) {
        if (node.fields.rule.operands) {
          for (let j = 0; j < node.fields.rule.operands.length; j++) {
            const operand = node.fields.rule.operands[j]
            if (operand.key && operand.key.data && operand.key.data.flowId) {
              const ref = operand.key.data.flowId.match(flowRefRegex)
              if (ref) {
                const referencedFlow = Object.values(flowCache).find(
                  (f) => f.name === ref[1]
                )
                const oldValue =
                  flowData.graph.nodes[i].fields.rule.operands[j].key.data
                    .flowId
                flowData.graph.nodes[i].fields.rule.operands[
                  j
                ].key.data.flowId = oldValue.replace(ref[0], referencedFlow.id)
              }
            }
          }
        }
        if (node.fields.rule.actions) {
          for (const key of Object.keys(node.fields.rule.actions)) {
            const action = node.fields.rule.actions[key]
            if (action && action.parameters && action.parameters.length) {
              for (let j = 0; j < action.parameters.length; j++) {
                const ref = action.parameters[j].match(flowRefRegex)

                if (ref) {
                  const referencedFlow = Object.values(flowCache).find(
                    (f) => f.name === ref[1]
                  )
                  const oldValue =
                    flowData.graph.nodes[i].fields.rule.actions[key].parameters[
                      j
                    ]

                  flowData.graph.nodes[i].fields.rule.actions[key].parameters[
                    j
                  ] = oldValue.replace(ref[0], referencedFlow.id)
                }
              }
            }
          }
        }
      }
    }
    // patch flow
    const ownerId = flowData.owners[0].id
    const { token } = Object.values(ownerCache).find(
      (owner) => owner.userData._id === ownerId
    )

    response = await fetch(`${flowRepositoryBase}/flows/${flowData.id}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(flowData),
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
