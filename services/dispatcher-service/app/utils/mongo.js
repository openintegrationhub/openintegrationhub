/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */

// const mongoose = require('mongoose');
// const config = require('../config');
const log = require('./logger');

const emptyOperation = () => new Promise((resolve) => {
  log.info('Hello');
  resolve(true);
});


module.exports = { emptyOperation };
