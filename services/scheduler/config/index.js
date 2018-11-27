const nconf = require('nconf');
const path = require('path');
const DEFAULTS = require('./default.json');
const ENVIRONMENT = process.env.NODE_ENV;

nconf.env();
nconf.file(path.resolve(__dirname, `${ENVIRONMENT}.json`));
nconf.defaults(DEFAULTS);
nconf.required([
    'POLLING_INTERVAL'
]);
module.exports = nconf;
