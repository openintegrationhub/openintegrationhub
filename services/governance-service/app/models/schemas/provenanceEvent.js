const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const associationObject = {
  wasAssociatedWith: String,
};

const startObject = {
  entity: String,
  atTime: Date, // xsd:dateTime;
  atLocation: String,
  hadActivity: String,
};

const endObject = {
  wasEndedBy: String,
};

const usageObject = {
  entity: String,
  hadRole: String,
};

// Define schema
const provenanceEvent = new Schema({
  entity: {
    id: { type: String, required: [true, 'We need to know the entity affected'] },
    entityType: String, // ex: oihUid
    value: String,
    invalidatedAtTime: Date, // xsd:dateTime;
    generatedAtTime: Date, // xsd:dateTime;
    wasAttributedTo: String,
    hadMember: String,
    qualifiedDerivation: String,
    alternateOf: [String], // recordUid
    wasDerivedFrom: [String],
    hadPrimarySource: [String],
    qualifiedGeneration: String,
    qualifiedInvalidation: String,
    qualifiedPrimarySource: String,
    qualifiedRevision: String,
  },
  activity: {
    id: String,
    activityType: String,
    startedAtTime: Date, // xsd:dateTime;
    endedAtTime: Date, // xsd:dateTime;
    wasInformedBy: String,
    wasAssociatedWith: String,
    generated: [String],
    invalidated: [String],
    wasEndedBy: String,
    wasStartedBy: String,
    used: String,
    qualifiedAssociation: associationObject,
    qualifiedStart: startObject,
    qualifiedEnd: endObject,
    qualifiedUsage: [usageObject],
  },
  agent: {
    id: { type: String, required: [true, 'We need to know the agent'] },
    agentType: String,
    name: String,
  },
  actedOnBehalfOf: [{
    first: Boolean,
    id: String,
    agentType: String,
    actedOnBehalfOf: String,
  }],
}, { collection: 'provenanceEvents', timestamps: true });

module.exports.provenanceEvent = provenanceEvent;
