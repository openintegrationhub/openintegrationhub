const log = require('@basaas/node-logger').getLogger('env', {
    level: 'error',
});

module.exports.required = (env) => {
    if (process.env[env]) { return process.env[env]; }
    log.error(`Missing required ${env}`);
    process.exit(1);
    return undefined;
};

module.exports.optional = (env, defaultValue) => {
    if (process.env[env]) { return process.env[env]; }
    return defaultValue;
};
