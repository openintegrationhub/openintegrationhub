const fetch = require("node-fetch")
const find = require("lodash/find")
const { services } = require("../config")
const { checkTools, waitForStatus, login, setupMinimal } = require("../helper")
const components = require("../data/components")
const tenants = require("../data/tenants")

const componentRepositoryBase = `http://localhost:${services.componentRepository.externalPort}`

let response = null

async function run() {
  checkTools(["docker-compose", "mongo"])

  await setupMinimal([services.componentRepository])

  await waitForStatus({
    url: `${componentRepositoryBase}/components`,
    status: 401,
  })

  for (const component of components) {
    const tenant = find(tenants, {
      users: [{ username: "t1_admin@local.dev" }],
    })
    const owner = find(tenant.users, { username: "t1_admin@local.dev" })
    console.log(owner)
    // login as owner
    const { token, id } = await login(owner)
    const data = { ...component }

    data.owners = [
      {
        id,
        type: "user",
      },
    ]

    response = await fetch(`${componentRepositoryBase}/components`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data,
      }),
    })

    if (response.status >= 400) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
  }
}

; (async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
