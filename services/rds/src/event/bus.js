const log = require('../logger')
const { createRawRecord } = require('./handlers')
const { EVENT } = require('../constant')

let eventBus

async function connectQueue(_eventBus) {
  eventBus = _eventBus
  await eventBus.subscribe(EVENT.RAW_RECORD_CREATED, async (event) => {
    log.trace(`Received event: ${JSON.stringify(event.headers)}`)

    try {
      await createRawRecord(event)
      await event.ack()
    } catch (err) {
      log.error(err)
      await event.nack()
    }
  })

  await eventBus.connect()
}

async function disconnectQueue() {
  await eventBus.disconnect()
}

async function reportHealth() {
  return (eventBus._connected); // eslint-disable-line
}

module.exports = {
  connectQueue,
  disconnectQueue,
  reportHealth,
}
