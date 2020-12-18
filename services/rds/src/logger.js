const bunyan = require('bunyan')
const bformat = require('bunyan-format')
const pkg = require('../package.json')

const formatOut = bformat({
  outputMode: 'long',
})

const log = bunyan.createLogger({
  name: pkg.name,
  stream: formatOut,
  level: process.env.LOG_LEVEL,
  src: true, // disable in production
})

module.exports = log
