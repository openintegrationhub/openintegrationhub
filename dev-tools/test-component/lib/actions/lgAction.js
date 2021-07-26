/* eslint consistent-return: "off" */
/* eslint max-len: 'off' */
/* eslint no-invalid-this: 0 no-console: 0 */

const log = require('../logger')

async function processAction(msg, cfg) {
  try {
    log.info('LGC Action:', msg)
    this.emit('data', {
      command: 'run-next-steps',
      parameters: ['60e7341ed36b1f00335a3c22:step_2'],
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