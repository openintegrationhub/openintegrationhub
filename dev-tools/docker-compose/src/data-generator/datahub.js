const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../', '.env') })
const fetch = require('node-fetch')

const { services } = require('../config')
const { login, getUserInfo } = require('../helper')
const generatePerson = require('./generate-person')
const generateProduct = require('./generate-product')
const generateDocument = require('./generate-document')

const PERSONS_SET_LENGTH = 10
const PRODUCTS_SET_LENGTH = 10
const DOCUMENTS_SET_LENGTH = 10

// use dev cluster setup

// const iamBase = 'https://iam.openintegrationhub.com'
// const metaDataBase = 'https://metadata.openintegrationhub.com/api/v1'
// const dataHubBase = 'https://data-hub.openintegrationhub.com'
// const domainId = '5db82cdb0e1048001a39711a'

// use local setup as target for import
const iamBase = null // will take local iam api base
const metaDataBase = `http://localhost:${services.metaDataRepository.externalPort}/api/v1`
const dataHubBase = `http://localhost:${services.dataHub.externalPort}`
const domainId = '61828b4c72bc3600212714ac'

const username = process.env.DEV_CLUSTER_USERNAME || 't1_admin@local.dev'
const password = process.env.DEV_CLUSTER_PASSWORD || 'password'

const personSchemaUri = `${metaDataBase}/domains/${domainId}/schemas/addresses/personV2.json`
const productSchemaUri = `${metaDataBase}/domains/${domainId}/schemas/products/product.json`

let response = null
let result = null

async function run() {
  // requires a full running oih setup
  console.log({
    customIamBase: iamBase,
    username,
    password,
  })
  // login as owner
  const { token } = await login({
    customIamBase: iamBase,
    username,
    password,
  })

  const userData = await getUserInfo(token, iamBase)

  // generate persons

  let data = generatePerson(PERSONS_SET_LENGTH).map((person) => ({
    domainId,
    schemaUri: personSchemaUri,
    content: {
      ...person.data,
    },
    refs: [
      {
        applicationUid: 'person-app-id',
        recordUid: person.metadata.recordUid,
        modificationHistory: [
          {
            user: token,
            operation: 'import',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
  }))

  response = await fetch(`${dataHubBase}/data/import`, {
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

  console.log(`${PERSONS_SET_LENGTH} Persons imported`)

  // generate products

  data = generateProduct(PRODUCTS_SET_LENGTH).map((product) => ({
    domainId,
    schemaUri: productSchemaUri,
    content: {
      ...product.data,
    },
    refs: [
      {
        applicationUid: 'product-app-id',
        recordUid: product.metadata.recordUid,
        modificationHistory: [
          {
            user: token,
            operation: 'import',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
  }))

  response = await fetch(`${dataHubBase}/data/import`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  data = generateDocument(DOCUMENTS_SET_LENGTH).map((document) => ({
    domainId,
    schemaUri: productSchemaUri,
    content: {
      ...document.data,
    },
    refs: [
      {
        applicationUid: 'document-app-id',
        recordUid: document.metadata.recordUid,
        modificationHistory: [
          {
            user: token,
            operation: 'import',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
  }))

  response = await fetch(`${dataHubBase}/data/import`, {
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

  console.log(`${PRODUCTS_SET_LENGTH} Products imported`)

  // Retrieve data
  response = await fetch(`${dataHubBase}/data`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status >= 400) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  result = await response.json()
  console.log('Records (all tenants)', result.meta)

  response = await fetch(`${dataHubBase}/data/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status >= 400) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  result = await response.json()
  console.log('Status (all tenants)', result.data)

  let url = new URL(`${dataHubBase}/data`)
  url.search = new URLSearchParams({ tenant: userData.tenant }).toString()

  response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status >= 400) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  result = await response.json()
  console.log(`Records ${userData.tenant}`, result.meta)

  url = new URL(`${dataHubBase}/data/status`)
  url.search = new URLSearchParams({ tenant: userData.tenant }).toString()

  response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status >= 400) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  result = await response.json()
  console.log(`Status ${userData.tenant}`, result.data)
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
