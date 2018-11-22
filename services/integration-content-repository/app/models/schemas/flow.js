

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const node = new Schema({
  id: String,
  componentId: String,
  command: String,
  name: String,
  description: String,
  fields: {},
  _id: false,
});

const edge = new Schema({
  id: String,
  config: {
    condition: String,
    mapper: {},
  },
  source: String,
  target: String,
  _id: false,
});

// Define schema
const flow = new Schema({
  name: String,
  description: String,
  graph: { nodes: [node], edges: [edge] },
  type: String,
  userId: String,
  workspaceId: String,
  oihid: String,
  status: String,
  createdAt: String,
  updatedAt: String,
});

module.exports.flow = flow;
