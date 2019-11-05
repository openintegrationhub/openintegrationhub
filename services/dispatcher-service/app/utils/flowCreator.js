/* eslint camelcase: "off" */
/* eslint no-await-in-loop: "off" */

const lodash = require('lodash');
const request = require('request-promise').defaults({
  simple: false,
  resolveWithFullResponse: true,
});
const {
  sdfAdapterId,
  sdfAdapterReceiveAction,
  sdfAdapterPublishAction,
  sdfAdapterRecordAction,
  flowRepoUrl,
} = require('../config');


function makeFlow(
  adapterId,
  transformerId,
  adapterAction,
  transformerAction,
  credentials_id,
  operation,
  domainId,
  schemaUri,
) {
  const newFlow = {
    name: 'Hub&Spoke Flow',
    description: 'This flow was automatically generated',
    graph: {},
    type: 'ordinary',
    cron: '* * * * *',
  };


  if (operation === 'GET') {
    newFlow.graph.nodes = [
      {
        id: 'step_1',
        componentId: adapterId,
        credentials_id,
        name: 'Source Adapter',
        function: adapterAction,
        description: 'Fetches data',
      },
      {
        id: 'step_2',
        componentId: transformerId,
        name: 'Source Transformer',
        function: transformerAction,
        description: 'Transforms data',
        fields: {
          domainId,
          schemaUri,
        },
      },
      {
        id: 'step_3',
        componentId: sdfAdapterId,
        name: 'SDF Adapter',
        function: sdfAdapterPublishAction,
        description: 'Passes data to SDF',
      },
    ];

    newFlow.graph.edges = [
      {
        source: 'step_1',
        target: 'step_2',
      },
      {
        source: 'step_2',
        target: 'step_3',
      },
    ];
  } else {
    newFlow.graph.nodes = [
      {
        id: 'step_1',
        componentId: sdfAdapterId,
        name: 'SDF Adapter',
        function: sdfAdapterReceiveAction,
        description: 'Receives data from SDF',
      },
      {
        id: 'step_2',
        componentId: transformerId,
        name: 'Target Transformer',
        function: transformerAction,
        description: 'Transforms data',
      },
      {
        id: 'step_3',
        componentId: adapterId,
        credentials_id,
        name: 'Target Adapter',
        function: adapterAction,
        description: 'Pushes data',
      },
      {
        id: 'step_4',
        componentId: sdfAdapterId,
        name: 'SDF Adapter',
        function: sdfAdapterRecordAction,
        description: 'Updates recordUid',
      },
    ];

    newFlow.graph.edges = [
      {
        source: 'step_1',
        target: 'step_2',
      },
      {
        source: 'step_2',
        target: 'step_3',
      },
      {
        source: 'step_3',
        target: 'step_4',
      },
    ];
  }

  return newFlow;
}

async function createFlows(applications, token) {
  const newApplications = lodash.cloneDeep(applications);
  for (let i = 0; i < newApplications.length; i += 1) {
    const app = applications[i];

    if (app.outbound.active) {
      for (let j = 0; j < app.outbound.flows.length; j += 1) {
        const current = app.outbound.flows[j];
        const flow = makeFlow(app.adapterId,
          app.transformerId,
          current.adapterAction,
          current.transformerAction,
          app.secretId,
          'GET',
          current.domainId,
          current.schemaUri);

        const options = {
          method: 'POST',
          json: true,
          url: `${flowRepoUrl}/flows`,
          body: flow,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const response = await request(options);

        app.outbound.flows[j].flowId = response.body.data.id;
      }
    }

    if (app.inbound.active) {
      for (let k = 0; k < app.inbound.flows.length; k += 1) {
        const current = app.inbound.flows[k];
        const flow = makeFlow(app.adapterId,
          app.transformerId,
          current.adapterAction,
          current.transformerAction,
          app.secretId,
          current.operation);

        const options = {
          method: 'POST',
          url: `${flowRepoUrl}/flows`,
          json: true,
          body: flow,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const response = await request(options);

        app.inbound.flows[k].flowId = response.body.data.id;
      }
    }
    newApplications[i] = app;
  }
  return newApplications;
}

module.exports = { createFlows, makeFlow };
