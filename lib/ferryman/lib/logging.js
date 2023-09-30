const bunyan = require('bunyan');
const _ = require('lodash');

let level;

if (process.env.NODE_ENV === 'test') {
    level = process.env.LOG_LEVEL || (bunyan.FATAL + 1); // turn off logging by default
} else {
    level = process.env.LOG_LEVEL || 'info';
}


// const data = Object.assign(
//   _.pick(process.env, [
//     'ELASTICIO_API_USERNAME',
//     'ELASTICIO_COMP_ID',
//     'ELASTICIO_COMP_NAME',
//     'ELASTICIO_CONTAINER_ID',
//     'ELASTICIO_CONTRACT_ID',
//     'ELASTICIO_EXEC_ID',
//     'ELASTICIO_EXEC_TYPE',
//     'ELASTICIO_EXECUTION_RESULT_ID',
//     'ELASTICIO_FLOW_ID',
//     'ELASTICIO_FLOW_VERSION',
//     'ELASTICIO_FUNCTION',
//     'ELASTICIO_STEP_ID',
//     'ELASTICIO_TASK_USER_EMAIL',
//     'ELASTICIO_TENANT_ID',
//     'ELASTICIO_USER_ID',
//     'ELASTICIO_WORKSPACE_ID',
//   ]),
//   { tag: process.env.ELASTICIO_FLOW_ID },
// );

const log = bunyan.createLogger({
    name: 'ferryman',
    level,
    serializers: bunyan.stdSerializers
});
// .child(data);

_.bindAll(log, [
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace'
]);

function criticalErrorAndExit(reason, err) {
    if (err instanceof Error) {
        log.fatal(err, reason);
    } else {
        log.fatal({ err, reason }, 'Error happened');
    }

    process.exit(1);
}

function ComponentLogger(options) {
    const currentLogger = bunyan.createLogger({
        name: 'component',
        level,
        serializers: bunyan.stdSerializers
    })
        .child(options);

    function decorateLogger(destination, logger) {
        for (const type of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) { // eslint-disable-line
            const originalMethod = logger[type];
            destination[type] = function log() { // eslint-disable-line
                // eslint-disable-next-line prefer-rest-params
                const args = Array.prototype.slice.call(arguments);

                if (args.length && typeof args[0] !== 'string') {
                    args[0] = String(args[0]);
                }

                return originalMethod.call(logger, ...args);
            };
        }

        const originalMethod = logger.child;
        destination.child = function child(...args) { // eslint-disable-line no-param-reassign
            const childLogger = originalMethod.call(logger, ...args);
            decorateLogger(childLogger, childLogger);
            return childLogger;
        };

        destination.level = logger.level.bind(destination);
    }

    decorateLogger(this, currentLogger);
}


module.exports = log;
module.exports.ComponentLogger = ComponentLogger;
module.exports.criticalErrorAndExit = criticalErrorAndExit;
