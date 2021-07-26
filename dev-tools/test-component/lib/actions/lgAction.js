/* eslint consistent-return: "off" */
/* eslint max-len: 'off' */
/* eslint no-invalid-this: 0 no-console: 0 */

const log = require('../logger')

/**
 * This method will be called from OIH platform upon receiving data
 *
 * @param {Object} msg - incoming message object that contains keys `data` and `metadata`
 * @param {Object} cfg - configuration that contains login information and configuration field values
 * @param {Object} snapshot - current step snapshot data
 * @param {Object} incomingMessageHeaders - contains transformed incoming message headers
 * @param {Object} tokenData - parsed orchestrator token data
 */

async function processAction(msg) {
  try {
    log.info('LGC Action:', msg)
    this.emit('data', {
      command: 'run-next-steps',
      parameters: ['60fe7dd0bffd380032dcbe50:step_1'],
    })
    // this.emit('data', {
    //   command: 'pass',
    // })
  } catch (e) {
    log.error(`ERROR: ${JSON.stringify(e, undefined, 2)}`)
    throw new Error(e)
  }
}

module.exports.process = processAction
