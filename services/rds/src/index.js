const config = require('./config')
const log = require('./logger')

const Server = require('./server')

process.title = `node ${config.name} ${config.version}`

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
    const server = new Server()
    await server.start()
    log.info(`RDS ${config.version} started at port ${config.port}`)
  } catch (error) {
    console.log(error)
  }
})()
