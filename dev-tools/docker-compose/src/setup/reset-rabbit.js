const { execSync } = require('child_process')
const { dbRoot } = require('../config')
const { checkTools, waitForRabbitMQ } = require('../helper')

checkTools(['docker'])

process.stdin.resume() // so the program will not close instantly

function exitHandler() {
  process.exit(0)
}

// do something when app is closing
process.on('exit', exitHandler.bind(null))

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null))

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null))
process.on('SIGUSR2', exitHandler.bind(null))

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null))

async function run() {
  execSync(`cd ${dbRoot} && docker-compose up -d`, {
    stdio: 'inherit',
  })

  waitForRabbitMQ()

  // docker exec -ti rabbitmq  sh -c "rabbitmqctl start_app"
  execSync(`docker exec -ti rabbitmq sh -c "rabbitmqctl stop_app"`, {
    stdio: 'inherit',
  })
  execSync(`docker exec -ti rabbitmq sh -c "rabbitmqctl reset"`, {
    stdio: 'inherit',
  })
  execSync(`docker exec -ti rabbitmq sh -c "rabbitmqctl start_app"`, {
    stdio: 'inherit',
  })
}
; (async () => {
  try {
    await run()
    process.exit(0)
  } catch (err) {
    console.log(err)
  }
})()
