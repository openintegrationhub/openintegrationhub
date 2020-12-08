const conf = require('./conf')

const log = require('@basaas/node-logger').getLogger(`${conf.name}/start`, {
  level: 'info',
})

const Server = require('./server')




process.title = `node ${conf.name} ${conf.version}`

function exitHandler(options, err) {
  if (options.cleanup) {
    log.info('Clean shutdown')
  }
  if (err) {
    log.error('error', err.message)
  }
  if (options.exit) {
    process.exit()
  }
}

process.on('exit', exitHandler.bind(null, { cleanup: true }))

process.on('SIGINT', exitHandler.bind(null, { exit: true }))


;(async () => {
  try {

    log.info(`started`)
  } catch (error) {
    console.log(error)
  }
})()
