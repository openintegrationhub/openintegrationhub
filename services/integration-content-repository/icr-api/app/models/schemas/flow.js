'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//Define schema
const flow = new Schema({
  type: String,
  oihid: String,
  links: {
    self: String
  },
  attributes: {
    name: String,
    status: String,
    created_at: String,
    current_status: String,
    default_mapper_type: String,
    description: String,
    updated_at: String
  }
});

module.exports.flow = flow;
