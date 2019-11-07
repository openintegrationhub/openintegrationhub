// General configuration file for variable urls, settings, etc.

const general = {
  mongoUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/dispatcherDev',
  amqpUrl: process.env.QUEUE_URL || 'amqp://guest:guest@localhost:5672',
  createEventName: process.env.CREATE_EVENT_NAME || 'data-hub.record.created',
  updateEventName: process.env.UPDATE_EVENT_NAME || 'data-hub.record.updated',
  deleteEventName: process.env.DELETE_EVENT_NAME || 'data-hub.record.deleted',
  createOperation: process.env.CREATE_OPERATION || 'CREATE',
  updateOperation: process.env.UPDATE_OPERATION || 'UPDATE',
  deleteOperation: process.env.DELETE_OPERATION || 'DELETE',
  flowRepoUrl: process.env.FLOWREPO_URL || 'http://localhost:3001',
  flowToken: process.env.FLOW_TOKEN || 'exampleToken',
  sdfAdapterId: process.env.SDF_ID || '5d2484d2a422ca001bda5690',
  sdfAdapterPublishAction: process.env.SDF_INBOUND || 'sendMessageToOih',
  sdfAdapterReceiveAction: process.env.SDF_OUTBOUND || 'receiveEvents',
  sdfAdapterRecordAction: process.env.SDF_RECORD || 'processRecordUid',
};

module.exports = general;
