const mongoose = require('mongoose')
const fetch = require('node-fetch')
const { v4 } = require('uuid')
const { login, getUserInfo } = require('../helper')
const { services } = require('../config')
const rawRecordDao = require('../../../../services/rds/src/dao/raw-record')
const generateProduct = require('./generate-product')

const RAW_RECORDS_SET_LENGTH = 10

// use local setup as target for import
const mongoUrl = 'mongodb://localhost:27017/rds'
const iamBase = null // will take local iam api base
const rdsBase = `http://localhost:${services.rds.externalPort}/api/v1`

const username = 't1_admin@local.dev'
const password = 'password'

let response = null
let result = null

async function run() {
  // requires a full running oih setup

  const { token } = await login({
    iamBase,
    username,
    password,
  })

  const userData = await getUserInfo(token, iamBase)

  await mongoose.connect(mongoUrl, {
    poolSize: 10,
    connectTimeoutMS: 5000,
    useNewUrlParser: true,
    // useUnifiedTopology: true,
  })

  for (let i = 0; i < RAW_RECORDS_SET_LENGTH; i++) {
    await rawRecordDao.create(
      userData._id,
      userData.tenant,
      v4(),
      JSON.stringify(generateProduct(1)[0])
    )
  }

  console.log(`${RAW_RECORDS_SET_LENGTH} raw records created`)

  // Retrieve data
  response = await fetch(`${rdsBase}/raw-record`, {
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

  response = await fetch(`${rdsBase}/raw-record/status`, {
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

  let url = new URL(`${rdsBase}/raw-record`)
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

  url = new URL(`${rdsBase}/raw-record/status`)
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

  await mongoose.connection.close()
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
