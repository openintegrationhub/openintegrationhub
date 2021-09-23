const bunyan = require('bunyan');
const bformat = require('bunyan-format');

const formatOut = bformat({ outputMode: 'long' /* , levelInString: true */ });

const log = bunyan.createLogger({
  name: 'app',
  streams: [

    {
      level: 'trace',
      // stream: process.stdout // log INFO and above to stdout
      stream: formatOut,
    },

  ],
  // stream: formatOut,
  level: 'trace',
  src: true, // disable in production
});

// const fs = require('fs');

// function exitHandler(options, exitCode) {
//   if (options === 'fatal') log.fatal(exitCode);
//
//   Object.keys(log.streams).forEach((stream) => {
//     try {
//       stream.stream.end();
//     } catch (e) {
//       console.log(`ERROR: ${e}`);
//     }
//   });
//   fs.appendFileSync(
//     'error.log',
//     `{status: "Process got terminated!",time: "${Date.now()}"}"\n`);
// }

// do something when app is closing
// process.on('exit', exitHandler.bind(null, { cleanup: true }));
// process.on('uncaughtException', exitHandler.bind('fatal', { cleanup: false }));

module.exports = log;
