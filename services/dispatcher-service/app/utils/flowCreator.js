/* eslint camelcase: "off" */
/* eslint no-await-in-loop: "off" */

const lodash = require('lodash');
const request = require('request-promise').defaults({
  simple: false,
  resolveWithFullResponse: true,
});
const log = require('./logger');
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
  schema,
  fields,
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
        fields,
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
          schema,
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
        fields,
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
  try {
    const newApplications = lodash.cloneDeep(applications);
    for (let i = 0; i < newApplications.length; i += 1) {
      const app = applications[i];

      if (app.outbound.active) {
        for (let j = 0; j < app.outbound.flows.length; j += 1) {
          const current = app.outbound.flows[j];
          const chunks = current.schemaUri.split('/');
          const domainId = chunks[chunks.length - 3];
          const schema = chunks[chunks.length - 1];
          const flow = makeFlow(
            app.adapterComponentId,
            app.transformerComponentId,
            current.adapterAction,
            current.transformerAction,
            app.secretId,
            'GET',
            domainId,
            schema,
            app.fields,
          );

          const options = {
            method: 'POST',
            json: true,
            url: `${flowRepoUrl}/flows`,
            body: flow,
            headers: {
              Authorization: token,
            },
          };
          const response = await request(options);

          if (response.statusCode === 201) {
            app.outbound.flows[j].flowId = response.body.data.id;
          } else {
            log.error('Could not create flow:');
            log.error(response.statusCode);
            log.error(JSON.stringify(response.body));
            return false;
          }
        }
      }

      if (app.inbound.active) {
        for (let k = 0; k < app.inbound.flows.length; k += 1) {
          const current = app.inbound.flows[k];
          const flow = makeFlow(
            app.adapterComponentId,
            app.transformerComponentId,
            current.adapterAction,
            current.transformerAction,
            app.secretId,
            current.operation,
            app.fields,
          );

          const options = {
            method: 'POST',
            url: `${flowRepoUrl}/flows`,
            json: true,
            body: flow,
            headers: {
              Authorization: token,
            },
          };
          const response = await request(options);

          if (response.statusCode === 201) {
            app.inbound.flows[k].flowId = response.body.data.id;
          } else {
            log.error('Could not create flow:');
            log.error(response.statusCode);
            log.error(JSON.stringify(response.body));
            return false;
          }
        }
      }
      newApplications[i] = app;
    }
    return newApplications;
  } catch (e) {
    log.error(`Error while creating flows: ${e}`);
    return false;
  }
}

async function deleteFlows(config, token) {
  try {
    const flowIds = [];

    for (let i = 0; i < config.applications.length; i += 1) {
      const app = config.applications[i];
      for (let j = 0; j < app.inbound.flows.length; j += 1) {
        flowIds.push(app.inbound.flows[j].flowId);
      }

      for (let k = 0; k < app.outbound.flows.length; k += 1) {
        flowIds.push(app.outbound.flows[k].flowId);
      }
    }

    for (let j = 0; j < flowIds.length; j += 1) {
      const options = {
        method: 'DELETE',
        url: `${flowRepoUrl}/flows/${flowIds[j]}`,
        json: true,
        headers: {
          Authorization: token,
        },
      };
      await request(options);
    }
  } catch (e) {
    log.error(`Error while deleting flows: ${e}`);
  }
}

module.exports = { createFlows, makeFlow, deleteFlows };
