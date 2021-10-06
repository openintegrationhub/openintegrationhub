const { execSync } = require('child_process')
const fetch = require('node-fetch')
const { dbRoot, devToolsRoot, env, services } = require('../config')
const { checkTools, waitForMongo, waitForStatus, login, runNpm } = require('../helper')
const serviceAccounts = require('../data/service-accounts')
const tenants = require('../data/tenants')

const iamBase = `http://localhost:${services.iam.externalPort}`

let response = null

async function run() {
  checkTools(['docker-compose', 'mongo'])

  execSync(`cd ${devToolsRoot} && docker-compose down`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })

  execSync(`cd ${dbRoot} && docker-compose up -d`, {
    stdio: 'inherit',
  })

  waitForMongo()

  execSync(`mongo ${services.iam.db} --eval "db.dropDatabase()"`, {
    stdio: 'inherit',
  })

  runNpm("services/iam", "build")

  execSync(`cd ${devToolsRoot} && docker-compose up -d iam`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })

  await waitForStatus({ url: iamBase, status: 200 })

  const { token } = await login({
    username: services.iam.adminUsername,
    password: services.iam.adminPassword,
  })

  for (const serviceAccount of serviceAccounts) {
    response = await fetch(`${iamBase}/api/v1/users`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(serviceAccount),
    })

    if (response.status !== 200) {
      throw new Error(response.status)
    }
  }
  // add tenants and users
  for (const tenant of tenants) {
    const users = [...tenant.users]
    delete tenant.users

    response = await fetch(`${iamBase}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tenant),
    })

    if (response.status !== 200) {
      throw new Error(response.status)
    }

    const { id } = await response.json()

    for (const user of users) {
      response = await fetch(`${iamBase}/api/v1/users`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...user,
          tenant: id,
        }),
      })

      if (response.status !== 200) {
        throw new Error(response.status)
      }
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
