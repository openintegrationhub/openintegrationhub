const mongoose = require('mongoose');

const { Schema } = mongoose;
const meta = require('./meta');

const split = new Schema({
  meta: [meta],
  payload: Object,
});

module.exports = split;
