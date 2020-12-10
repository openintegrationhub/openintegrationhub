const bunyan = require('bunyan')
const config = require('../config')
const log = require('../logger')
const { createRawRecord } = require('./handlers')

const logger = bunyan.createLogger({ name: 'events' })

let eventBus

async function connectQueue(EventBus, transport) {
  eventBus = new EventBus({ transport, logger, serviceName: config.name })

  await eventBus.subscribe('raw-record.created', async (event) => {
    log.trace(`Received event: ${JSON.stringify(event.headers)}`)

    try {
      await createRawRecord(event)
      log.info('done')
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
