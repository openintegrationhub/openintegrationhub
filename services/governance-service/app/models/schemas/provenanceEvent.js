const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Define schema
const provenanceEvent = new Schema({
  entity: {
    oihUid: String,
    domain: String,
    schema: String,
    records: [
      {
        application: String,
        recordUid: String,
      },
    ],
  },
  activity: {
    action: String,
    function: String,
    flowId: String,
    'prov:startTime': Date,
    'prov:endTime': Date,
    protocol: String,
  },
  agent: {
    kind: String,
    id: String,
    name: String,
  },
  actedOnBehalfOf: {
    'prov:delegate': {
      kind: String,
      id: String,
    },
    'prov:responsible': {
      kind: String,
      id: String,
    },
  },
}, { collection: 'provenanceEvents', timestamps: true });

module.exports.provenanceEvent = provenanceEvent;
