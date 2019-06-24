const mongoose = require('mongoose');

const { Schema } = mongoose;
const meta = require('./meta.js');

const split = new Schema({
  meta: [meta],
  payload: Object,
});

module.exports = split;
