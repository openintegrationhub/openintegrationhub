const { execSync } = require("child_process")
const fetch = require("node-fetch")
const { dbRoot, devToolsRoot, env, services } = require("../config")
const { checkTools, waitForMongo, waitForIAM } = require("../helper")
const tenants = require("../data/tenants")

const iamBase = `http://localhost:${services.iam.externalPort}`

async function run() {
  checkTools(["docker-compose", "mongo"])

  execSync(`cd ${devToolsRoot} && docker-compose down`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  })

  execSync(`cd ${dbRoot} && docker-compose up -d`, {
    stdio: "inherit",
  })

  waitForMongo()

  execSync(`mongo ${services.iam.dbName} --eval "db.dropDatabase()"`, {
    stdio: "inherit",
  })

  execSync(`cd ${devToolsRoot} && docker-compose up -d iam`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  })

  await waitForIAM()

  // login with admin account
  let response = await fetch(`${iamBase}/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: services.iam.adminUserName,
      password: services.iam.adminPassword,
    }),
  })

  if (response.status !== 200) {
    throw new Error("Account missing")
  }

  const { token } = await response.json()

  // create service account
  response = await fetch(`${iamBase}/api/v1/users`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      username: services.iam.serviceUserName,
      password: services.iam.servicePassword,
      firstname: "a",
      lastname: "b",
      role: "SERVICE_ACCOUNT",
      status: "ACTIVE",
      permissions: ["all"],
    }),
  })

  if (response.status !== 200) {
    throw new Error(response.status)
  }

  // add tenants and users
  for (const tenant of tenants) {
    const users = [...tenant.users]
    delete tenant.users

    response = await fetch(`${iamBase}/api/v1/tenants`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
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
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
