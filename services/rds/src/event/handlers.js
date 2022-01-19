const mongoose = require('mongoose')
const rawRecordDAO = require('../dao/raw-record')

function validateRecord(event) {
  if (typeof event.payload.rawRecordId === 'undefined')
    throw new Error('rawRecordId missing')
  if (typeof event.payload.payload === 'undefined')
    throw new Error('payload missing')
}

function transformRecord(event) {
  const { rawRecordId } = event.payload

  let userId = null
  let payload = null
  let tenant = null

  // optional
  if (event.payload.userId) userId = event.payload.userId
  if (event.payload.tenant) tenant = event.payload.tenant

  if (
    typeof event.payload.payload === 'object' &&
    event.payload.payload !== null
  ) {
    payload = JSON.stringify(event.payload.payload)
  } else {
    payload = event.payload.payload
  }

  return [userId, tenant, rawRecordId, payload]
}

module.exports = {
  async createRawRecord(event) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready')
    }
    validateRecord(event)
    await rawRecordDAO.create(...transformRecord(event))
  },
}
