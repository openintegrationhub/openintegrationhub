const bunyan = require('bunyan')
const pkg = require('../package.json')

const log = bunyan.createLogger({
  name: pkg.name,
  serializers: bunyan.stdSerializers,
  level: process.env.LOG_LEVEL,
  src: true, // disable in production
})

module.exports = log
