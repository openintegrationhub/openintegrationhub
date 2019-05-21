

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const node = new Schema({
  id: { type: String, required: true, maxlength: 10 },
  componentId: {
    type: String,
    required: true,
    validate: {
      validator(n) {
        return (mongoose.Types.ObjectId.isValid(n));
      },
      message: props => `The componentId ${props.value} is not a valid ID for the component repository.`,
    },
  },
  function: { type: String, required: true, maxlength: 30 },
  name: { type: String, maxlength: 30 },
  description: { type: String, maxlength: 100 },
  fields: {},
  _id: false,
});

const edge = new Schema({
  id: { type: String, required: true, maxlength: 10 },
  config: {
    condition: { type: String, maxlength: 30 },
    mapper: {},
  },
  source: { type: String, required: true, maxlength: 10 },
  target: { type: String, required: true, maxlength: 10 },
  _id: false,
});

const owner = new Schema({
  id: { type: String, required: true, maxlength: 30 },
  type: { type: String, required: true, maxlength: 30 },
  _id: false,
});

// Define schema
const flow = new Schema({
  name: { type: String, maxlength: 30 },
  description: { type: String, maxlength: 100 },
  graph: {
    type: Object,
    properties: {
      nodes: { type: [node], required: true },
      edges: { type: [edge], required: [function () { return this.graph.nodes.length > 1; }, 'Flows with more than one node require edges'] },
    },
    required: true,
  },
  type: { type: String, maxlength: 30 },
  owners: [owner],
  status: { type: String, default: 'inactive' },
  cron: { type: String, maxlength: 20 },
},
{ collection: 'flows', timestamps: true });

module.exports.flow = flow;
