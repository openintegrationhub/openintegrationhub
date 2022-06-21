const bunyan = require('bunyan');
const bformat = require('bunyan-format');

const formatOut = bformat({ outputMode: 'long' /* , levelInString: true */ });

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
});

const fs = require('fs');

/*eslint-disable */
function exitHandler(options, exitCode) {
  console.log(options);
  console.log(exitCode);
  if (options == 'fatal') log.fatal(exitCode);

  for (var s in log.streams) {
    if (log.streams[s] && log.streams[s].stream) {
      try {
        log.streams[s].stream.end();
      } catch (e) {
        console.log(e);
      }
    }
  }
  fs.appendFileSync('error.log', '{status: "Process got terminated! Logging data might be incomplete",time: "' + Date.now() + '"}"\n');
}
/* eslint-enable */

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('uncaughtException', exitHandler.bind('fatal', { cleanup: false }));

module.exports = log;
