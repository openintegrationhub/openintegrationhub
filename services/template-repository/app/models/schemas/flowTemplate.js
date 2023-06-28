const mongoose = require('mongoose');
const { AUTH_TYPE } = require('../../constants');

const Schema = mongoose.Schema;

const node = new Schema({
  id: { type: String, required: [true, 'Flow Template nodes require an id.'] },
  componentId: {
    type: mongoose.Types.ObjectId,
    required: [true, 'Flow Template nodes require a componentId.'],
  },
  function: { type: String, required: [true, 'Flow Template nodes require a function.'] },
  name: { type: String },
  credentials_id: { type: mongoose.Types.ObjectId },
  description: { type: String },
  fields: {},
  nodeSettings: {},
  tenant: { type: String },
  authorization: {
    authType: {
      type: String,
      enum: Object.keys(AUTH_TYPE),
    },
    authClientId: {
      type: mongoose.Types.ObjectId,
    },
  },
  _id: false,
});

const edge = new Schema({
  id: { type: String },
  config: {
    condition: { type: String },
    mapper: {},
  },
  source: { type: String, required: [true, 'Flow Template edges require a source.'] },
  target: { type: String, required: [true, 'Flow Template edges require a target.'] },
  _id: false,
});

const owner = new Schema({
  id: { type: String, required: [true, 'Flow Template owners require an id.'] },
  type: { type: String, required: [true, 'Flow Template owners require a type.'] },
  _id: false,
});

const graph = new Schema({
  nodes: {
    type: [node],
    validate: {
      validator(n) {
        return (n.length > 0);
      },
      message: 'Flow Templates require at least one node.',
    },
  },
  edges: {
    type: [edge],
    validate: {
      validator(e) {
        return !(this.nodes.length > 1 && e.length === 0);
      },
      message: 'Flow Templates with more than one node require edges.',
    },
  },
  _id: false,
});

// Define schema
const flowTemplate = new Schema({
  name: { type: String },
  description: { type: String },
  graph: { type: graph, required: [true, 'Flow Templates require a graph.'] },
  type: { type: String },
  owners: { type: [owner] },
  status: { type: String, default: 'draft' },
  cron: { type: String },
  flowSettings: {},
  sourceTemplate: { type: mongoose.Types.ObjectId },
}, { collection: 'flowTemplates', timestamps: true });

module.exports.flowTemplate = flowTemplate;
