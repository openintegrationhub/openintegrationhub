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
  createOperation,
  updateOperation,
  deleteOperation,
  amqpUrl,
} = require('../config');

function makeFlow(app, flow) {
  const newFlow = {
    description: 'This flow was automatically generated',
    graph: {},
    type: 'ordinary',
    cron: '* * * * *',
  };

  if ([createOperation, updateOperation, deleteOperation].includes(flow.operation)) {
    newFlow.name = `H&S Inbound ${flow.operation} Flow for ${app.applicationName}`;
    newFlow.graph.nodes = [
      {
        id: 'step_1',
        componentId: sdfAdapterId,
        name: 'SDF Adapter',
        function: sdfAdapterReceiveAction,
        description: 'Receives data from SDF',
        fields: {
          amqpUrl,
        },
      },
      // {
      //   id: 'step_2',
      //   componentId: app.transformerComponentId,
      //   name: `${app.applicationName} Transformer`,
      //   function: flow.transformerAction,
      //   description: 'Transforms data',
      // },
      {
        id: 'step_2',
        componentId: app.adapterComponentId,
        credentials_id: app.secretId,
        ...(app.secretId && { credentials_id: app.secretId }),
        ...(app.fields && { fields: app.fields }),
        name: `${app.applicationName} Adapter`,
        function: flow.adapterAction,
        description: 'Pushes data',
      },
      {
        id: 'step_3',
        componentId: sdfAdapterId,
        name: 'SDF Adapter',
        function: sdfAdapterRecordAction,
        description: 'Updates recordUid',
        fields: {
          amqpUrl,
        },
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
      // {
      //   source: 'step_3',
      //   target: 'step_4',
      // },
    ];
  } else {
    newFlow.name = `H&S Outbound Flow for ${app.applicationName}`;
    let domainId;
    let schema;

    if (flow.schemaUri) {
      const chunks = flow.schemaUri.split('/');
      domainId = chunks[chunks.length - 3];
      schema = chunks[chunks.length - 1];
    }

    newFlow.graph.nodes = [
      {
        id: 'step_1',
        componentId: app.adapterComponentId,
        ...(app.secretId && { credentials_id: app.secretId }),
        fields: {
          domainId,
          schema,
          applicationUid: app.applicationUid,
          ...app.fields,
        },
        name: `${app.applicationName} Adapter`,
        function: flow.adapterAction,
        description: 'Fetches data',
      },
      // {
      //   id: 'step_2',
      //   componentId: app.transformerComponentId,
      //   name: `${app.applicationName} Transformer`,
      //   function: flow.transformerAction,
      //   description: 'Transforms data',
      // },
      {
        id: 'step_2',
        componentId: sdfAdapterId,
        name: 'SDF Adapter',
        function: sdfAdapterPublishAction,
        description: 'Passes data to SDF',
        fields: {
          amqpUrl,
        },
      },
    ];

    newFlow.graph.edges = [
      {
        source: 'step_1',
        target: 'step_2',
      },
      // {
      //   source: 'step_2',
      //   target: 'step_3',
      // },
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
          if (!current.flowId) {
            const flow = makeFlow(
              app,
              current,
              'GET',
            );

            const initialFlow = { ...flow };
            initialFlow.graph = { nodes: [{ id: 'empty', componentId: '5f895922926f72cf78353272', function: 'empty' }], edges: [] };

            const initialOptions = {
              method: 'POST',
              json: true,
              url: `${flowRepoUrl}/flows`,
              body: initialFlow,
              headers: {
                Authorization: token,
              },
            };

            const createResponse = await request(initialOptions);

            const flowId = createResponse.body.data.id;

            const nodesLength = flow.graph.nodes.length;

            for (let k = 0; k < nodesLength; k += 1) {
              if (flow.graph.nodes[k].componentId === sdfAdapterId) {
                flow.graph.nodes[k].fields.flowId = flowId;
              }
            }

            const options = {
              method: 'PATCH',
              json: true,
              url: `${flowRepoUrl}/flows/${flowId}`,
              body: flow,
              headers: {
                Authorization: token,
              },
            };

            const response = await request(options);

            if (response.statusCode === 200) {
              app.outbound.flows[j].flowId = flowId;
            } else {
              log.error('Could not create flow:', flowId);
              log.error(response.statusCode);
              log.error(JSON.stringify(response.body));
              return false;
            }
          }
        }
      }

      if (app.inbound.active) {
        for (let k = 0; k < app.inbound.flows.length; k += 1) {
          const current = app.inbound.flows[k];
          if (!current.flowId) {
            const flow = makeFlow(
              app,
              current,
            );

            const initialFlow = { ...flow };
            initialFlow.graph = { nodes: [{ id: 'empty', componentId: '5f895922926f72cf78353272', function: 'empty' }], edges: [] };

            const initialOptions = {
              method: 'POST',
              json: true,
              url: `${flowRepoUrl}/flows`,
              body: initialFlow,
              headers: {
                Authorization: token,
              },
            };

            const createResponse = await request(initialOptions);

            const flowId = createResponse.body.data.id;

            const nodesLength = flow.graph.nodes.length;

            for (let l = 0; l < nodesLength; l += 1) {
              if (flow.graph.nodes[l].componentId === sdfAdapterId) {
                flow.graph.nodes[l].fields.flowId = flowId;
              }
            }

            const options = {
              method: 'PATCH',
              url: `${flowRepoUrl}/flows/${flowId}`,
              json: true,
              body: flow,
              headers: {
                Authorization: token,
              },
            };
            const response = await request(options);

            if (response.statusCode === 200) {
              app.inbound.flows[k].flowId = flowId;
            } else {
              log.error('Could not create flow:', flowId);
              log.error(response.statusCode);
              log.error(JSON.stringify(response.body));
              return false;
            }
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

async function deleteFlowsById(flowIds, token) {
  try {
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

function getFlowIds(applications) {
  try {
    const flowIds = [];

    for (let i = 0; i < applications.length; i += 1) {
      const app = applications[i];
      for (let j = 0; j < app.inbound.flows.length; j += 1) {
        flowIds.push(app.inbound.flows[j].flowId);
      }

      for (let k = 0; k < app.outbound.flows.length; k += 1) {
        flowIds.push(app.outbound.flows[k].flowId);
      }
    }

    return flowIds;
  } catch (e) {
    log.error(`Error while collecting flow Ids: ${e}`);
    return false;
  }
}

async function deleteFlows(applications, token) {
  const flowIds = getFlowIds(applications);
  await deleteFlowsById(flowIds, token);
}

async function updateConfigFlows(original, incoming, token) {
  const newConfig = lodash.cloneDeep(incoming);

  const oldFlowIds = getFlowIds(original.applications);
  const newFlowIds = getFlowIds(incoming.applications);

  const deletedFlows = oldFlowIds.filter((uid) => !newFlowIds.includes(uid));

  newConfig.applications = await createFlows(newConfig.applications, token);
  await deleteFlowsById(deletedFlows);

  return newConfig;
}

module.exports = {
  createFlows, makeFlow, deleteFlows, updateConfigFlows,
};
