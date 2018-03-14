'use strict';

const bunyan = require('bunyan');
const _ = require('lodash');

let level;

if (process.env.NODE_ENV === 'test') {
    level = bunyan.FATAL + 1; //turn off logging
} else {
    level = process.env.LOG_LEVEL || 'info';
}

function criticalError(err) {
    console.error('Error happened: %s', err.message);
    console.error(err.stack);
    process.exit(1);
}

const data = Object.assign(
    _.pick(process.env, [
        'ELASTICIO_TASK_ID',
        'ELASTICIO_EXEC_ID',
        'ELASTICIO_STEP_ID',
        'ELASTICIO_COMP_ID',
        'ELASTICIO_FUNCTION'
    ]),
    { tag: process.env.ELASTICIO_TASK_ID }
);

const log = bunyan.createLogger({
    name: 'sailor',
    level: level,
    serializers: bunyan.stdSerializers
})
    .child(data);

_.bindAll(log, [
    'error',
    'warn',
    'info',
    'debug',
    'trace'
]);

module.exports = log;
module.exports.criticalError = criticalError;
