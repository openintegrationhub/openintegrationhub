const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const find = require('lodash/find')
const FormData = require('form-data')
const { services } = require('../config')
const {
  checkTools,
  waitForStatus,
  login,
  getUserInfo,
  setupMinimal,
} = require('../helper')
const domains = require('../data/meta-data/domains')
const tenants = require('../data/tenants')

const metaDataBase = `http://localhost:${services.metaDataRepository.externalPort}/api/v1`
let domainCache = {}

let response = null

async function run() {
  checkTools(['docker-compose', 'mongo'])

  await setupMinimal([services.metaDataRepository])

  await waitForStatus({
    url: `${metaDataBase}/domains`,
    status: 401,
  })

  for (const domain of domains) {
    const tenant = find(tenants, {
      users: [{ username: domain.owners[0].id }],
    })

    const owner = find(tenant.users, { username: domain.owners[0].id })

    // login as owner
    const { token } = await login(owner)
    const { _id } = await getUserInfo(token)

    const data = { ...domain }

    data.owners = [
      {
        id: _id,
        type: 'USER',
      },
    ]

    response = await fetch(`${metaDataBase}/domains`, {
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

    domainCache = (await response.json()).data

    console.log('Domain created:', domainCache)

    const filePath = path.resolve('data/meta-data/', 'schemas.zip')

    console.log(filePath)
    const form = new FormData()

    // form.append('Content-Type', 'application/octet-stream')
    form.append('archive', fs.createReadStream(filePath))

    response = await fetch(
      `${metaDataBase}/domains/${domainCache.id}/schemas/import`,
      {
        method: 'POST',
        headers: {
          // Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    )

    if (response.status >= 400) {
      throw new Error(`${response.status} ${response.statusText}`)
    }

    console.log('Schemas imported')
  }
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
