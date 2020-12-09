const bunyan = require('bunyan')
const bformat = require('bunyan-format')

const formatOut = bformat({ outputMode: 'long' /* , levelInString: true */ })

const log = bunyan.createLogger({
  name: 'app',
  streams: [
    {
      level: 'trace',
      // stream: process.stdout            // log INFO and above to stdout
      stream: formatOut,
    },
  ],
  // stream: formatOut,
  level: 'trace',
  src: true, // disable in production
})

module.exports = log
