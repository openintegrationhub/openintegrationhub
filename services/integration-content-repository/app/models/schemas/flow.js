'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const relation = new Schema({
  type: String,
  id: String,
  _id: false
});

const version = new Schema ({
  name: Number,
  date: String,
  _id: false
});

const fielditem = new Schema ({
  'interval': String,
  _id: false
});

const node = new Schema({
  id: String,
  command: String,
  name: String,
  description: String,
  fields: [fielditem],
  _id: false
});

const edge = new Schema({
  id: String,
  config: {
    mapper_type: String,
    condition: String,
    mapper: {
      to: String,
      subject: String,
      textbody: String,
    },
    source: String,
    target: String,
  },
  _id: false
});

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
    updated_at: String,
    versions: [version],
    latest_version: version

  },
  relationships:[relation],
  graph: {nodes:[node], edges:[edge]}
});

module.exports.flow = flow;
