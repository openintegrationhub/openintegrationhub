const fetch = require('node-fetch')
const find = require('lodash/find')
const { services } = require('../config')
const secrets = require('../data/secrets')
const {
  checkTools,
  waitForStatus,
  login,
  setupMinimal,
  getUserInfo,
} = require('../helper')
const tenants = require('../data/tenants')

const secretServiceBase = `http://localhost:${services.secretService.externalPort}`

let response = null
const ownerCache = {}

async function run() {
  checkTools(['docker-compose', 'mongo'])

  await setupMinimal([services.secretService])

  await waitForStatus({
    url: `${secretServiceBase}/api/v1/secrets`,
    status: 401,
  })

  for (const secret of secrets) {
    const tenant = find(tenants, {
      users: [{ username: secret.owners[0].id }],
    })
    const owner = find(tenant.users, { username: secret.owners[0].id })

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

    const data = { ...secret }

    data.owners = [
      {
        id: userData._id,
        type: 'user',
      },
    ]

    response = await fetch(`${secretServiceBase}/api/v1/secrets`, {
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
