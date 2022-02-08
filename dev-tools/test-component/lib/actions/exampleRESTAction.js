/* eslint consistent-return: "off" */
/* eslint max-len: 'off' */
/* eslint no-invalid-this: 0 no-console: 0 */

const log = require('../logger')

/**
 * This action will be called via REST API http://node:port/process and works like an express js middleware
 * Make sure that an appropriate response is sent. Unexpected errors are caught by an error handler
 *
 * @param {Function} req - express js middleware
 * @param {Function} res - express js middleware
 * @param {Function} next - express js middleware
 * @param {Object} actionParams - action parameters - { actionName: "string", secretId: "string", data: "object"}
 */

async function processAction(req, res, next, actionParams) {
  const { actionName, secretId, data } = actionParams
  log.debug('Going to process action', actionName)
  log.debug('Received data', secretId, data)
  /*
    Put logic here and send response
  */

  // examples
  if (data === null) {
    // use default error handler with 500 status code
    throw new Error('Oh noo!')
  } else if (!data) {
    // provide custom response error
    return next({
      status: 418,
      message: 'No data provided',
    })
  }

  if (data.custom) {
    return res.sendStatus(201)
  }

  // response data should be sent in following format
  /* 
    {
      data: {},
      meta: {} // optional
    }
  */
  res.send({
    data,
  })
}

module.exports.process = processAction
