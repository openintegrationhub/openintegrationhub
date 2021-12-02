const mongoose = require('mongoose');
const { AUTH_TYPE } = require('../../constants');

const Schema = mongoose.Schema;

const node = new Schema({
  id: { type: String, required: [true, 'Flow Template nodes require an id.'], maxlength: 30 },
  componentId: {
    type: mongoose.Types.ObjectId,
    required: [true, 'Flow Template nodes require a componentId.'],
  },
  function: { type: String, required: [true, 'Flow Template nodes require a function.'], maxlength: 60 },
  name: { type: String, maxlength: 60 },
  credentials_id: { type: mongoose.Types.ObjectId, maxlength: 30 },
  description: { type: String, maxlength: 100 },
  fields: {},
  nodeSettings: {},
  tenant: { type: String, maxlength: 30 },
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
  id: { type: String, maxlength: 10 },
  config: {
    condition: { type: String, maxlength: 30 },
    mapper: {},
  },
  source: { type: String, required: [true, 'Flow Template edges require a source.'], maxlength: 30 },
  target: { type: String, required: [true, 'Flow Template edges require a target.'], maxlength: 30 },
  _id: false,
});

const owner = new Schema({
  id: { type: String, required: [true, 'Flow Template owners require an id.'], maxlength: 30 },
  type: { type: String, required: [true, 'Flow Template owners require a type.'], maxlength: 30 },
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
  name: { type: String, maxlength: 60 },
  description: { type: String, maxlength: 100 },
  graph: { type: graph, required: [true, 'Flow Templates require a graph.'] },
  type: { type: String, maxlength: 30 },
  owners: { type: [owner] },
  status: { type: String, default: 'draft' },
  cron: { type: String, maxlength: 20 },
  flowSettings: {},
}, { collection: 'flowTemplates', timestamps: true });

module.exports.flowTemplate = flowTemplate;
