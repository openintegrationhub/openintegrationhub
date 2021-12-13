/* eslint no-continue: "off" */

const fetch = require('node-fetch');
const config = require('../config/index');
const log = require('../config/logger');
const { getProvenanceEvents } = require('../api/controllers/mongo');

// Get all refs of a given object
async function getRefs(id, recordUid, token) {
  if (!id && !recordUid) return false;

  const url = id ? `${config.dataHubUrl}/${id}` : `${config.dataHubUrl}/recordId/${id}`;

  const response = await fetch(
    url,
    {
      method: 'GET',
      headers: {
        Authorization: token,
      },
    },
  );

  if (response.status !== 200) return false;

  const object = await response.json();

  if (!object || !object.data || !object.data.refs) return false;

  return {
    refs: object.data.refs,
    id: object.data.id,
  };
}

// Calculates object distribution by events
async function getObjectDistribution(user) {
  try {
    const allEvents = await getProvenanceEvents(user, 100, 1, false, false, false, false, false);

    const serviceCounts = {};

    for (let i = 0; i < allEvents.data.length; i += 1) {
      const currentEvent = allEvents.data[i];
      const serviceEntry = currentEvent.actedOnBehalfOf.find((el) => el.agentType === 'Application');
      if (!serviceEntry) continue;

      const serviceName = serviceEntry.actedOnBehalfOf || 'unkownService';

      if (!(serviceName in serviceCounts)) {
        serviceCounts[serviceName] = {
          received: 0,
          updated: 0,
          created: 0,
          deleted: 0,
        };
      }

      switch (currentEvent.activity.activityType) {
      case 'ObjectReceived':
        serviceCounts[serviceName].received += 1;
        break;
      case 'ObjectUpdated':
        serviceCounts[serviceName].updated += 1;
        break;
      case 'ObjectCreated':
        serviceCounts[serviceName].created += 1;
        break;
      case 'ObjectDeleted':
        serviceCounts[serviceName].deleted += 1;
        break;
      default:
        break;
      }
    }

    return serviceCounts;
  } catch (e) {
    log.error(e);
    return false;
  }
}

// Calculates object distribution and formats as a graph
async function getObjectDistributionAsGraph(user) {
  try {
    const allEvents = await getProvenanceEvents(user, 100, 1, false, false, false, false, false);

    const nodes = [];
    const edges = [];

    for (let i = 0; i < allEvents.data.length; i += 1) {
      const currentEvent = allEvents.data[i];
      const serviceEntry = currentEvent.actedOnBehalfOf.find((el) => el.agentType === 'Application');
      const flowEntry = currentEvent.actedOnBehalfOf.find((el) => el.agentType === 'Flow');
      if (!serviceEntry || !flowEntry) continue;

      const serviceName = serviceEntry.actedOnBehalfOf || 'unkownService';
      const flowId = flowEntry.actedOnBehalfOf || 'unknownFlow';

      let nodeIndex = nodes.findIndex((el) => el.data.id === serviceName);

      if (nodeIndex === -1) {
        nodes.push({
          data: {
            id: serviceName,
            created: 0,
            updated: 0,
            received: 0,
            deleted: 0,
          },
        });

        nodeIndex = nodes.length - 1;
      }

      let edgeIndex = edges.findIndex((el) => el.data.id === flowId);

      if (edgeIndex === -1) {
        edges.push({
          data: {
            id: flowId,
            created: 0,
            updated: 0,
            received: 0,
            deleted: 0,
            source: false,
            target: false,
          },
        });

        edgeIndex = edges.length - 1;
      }

      if (!edges[edgeIndex].data.source && currentEvent.activity.activityType === 'ObjectReceived') {
        edges[edgeIndex].data.source = serviceName;
      }

      if (!edges[edgeIndex].data.target && currentEvent.activity.activityType !== 'ObjectReceived') {
        edges[edgeIndex].data.target = serviceName;
      }

      switch (currentEvent.activity.activityType) {
      case 'ObjectReceived':
        nodes[nodeIndex].data.received += 1;
        edges[edgeIndex].data.received += 1;
        break;
      case 'ObjectUpdated':
        nodes[nodeIndex].data.updated += 1;
        edges[edgeIndex].data.updated += 1;
        break;
      case 'ObjectCreated':
        nodes[nodeIndex].data.created += 1;
        edges[edgeIndex].data.created += 1;
        break;
      case 'ObjectDeleted':
        nodes[nodeIndex].data.deleted += 1;
        edges[edgeIndex].data.deleted += 1;
        break;
      default:
        break;
      }
    }

    return { nodes, edges };
  } catch (e) {
    log.error(e);
    return false;
  }
}

// Get flows of a user and check if any cause a warning
async function getFlows(token, page) {
  try {
    const currentPage = (page && page > 0) ? page : 1;
    const response = await fetch(
      `${config.flowRepoUrl}/flows?page=${currentPage}`,
      {
        method: 'GET',
        headers: {
          Authorization: token,
        },
      },
    );

    if (response.status !== 200) return false;

    const flows = response.json();
    return flows;
  } catch (e) {
    log.error(e);
    return false;
  }
}

function getFlowsWithProblematicSettings(flows) {
  const affectedFlows = [];
  for (let i = 0; i < flows.length; i += 1) {
    if (!flows[i].graph || !flows[i].graph.nodes) {
      affectedFlows.push({
        flowId: flows[i].id,
        reason: 'No graph or nodes',
        flowData: flows[i],
      });
    } else {
      for (let j = 0; j < flows[i].graph.nodes.length; j += 1) {
        if (!flows[i].graph.nodes[j].nodeSettings) {
          affectedFlows.push({
            flowId: flows[i].id,
            reason: 'No node settings',
            flowData: flows[i],
          });
          break;
        } else if ('governance' in flows[i].graph.nodes[j].nodeSettings) {
          if (flows[i].graph.nodes[j].nodeSettings.governance !== true) {
            affectedFlows.push({
              flowId: flows[i].id,
              reason: 'Governance is not set to true',
              flowData: flows[i],
            });
            break;
          }
        } else {
          affectedFlows.push({
            flowId: flows[i].id,
            reason: 'No governance settings',
            flowData: flows[i],
          });
          break;
        }
      }
    }
  }

  return affectedFlows;
}

// Iterate over all flows and check the settings
async function checkFlows(token) {
  let totalPages = 1;
  let flowReproResult = await getFlows(token);
  if (flowReproResult
      && 'meta' in flowReproResult
      && 'totalPages' in flowReproResult.meta
  ) {
    totalPages = flowReproResult.meta.totalPages;
  }

  let affectedFlows = getFlowsWithProblematicSettings(flowReproResult.data);

  let page = 2;
  while (page <= totalPages) {
    flowReproResult = await getFlows(token, page);
    affectedFlows = affectedFlows.concat(getFlowsWithProblematicSettings(flowReproResult));
    page += 1;
  }

  return affectedFlows;
}

function drawRingChart(maxIn, maxOut, nodeData) {
  const percentageIn = (nodeData.received)? Math.ceil((nodeData.received / maxIn) * 100) : 0;
  const percentageInLeft = 100 - percentageIn;

  const percentageOut = (nodeData.sent)? Math.ceil((nodeData.sent / maxOut) * 100) : 0;
  const percentageOutLeft = 100 - percentageOut;

  const svg = `<svg width="120px" height="120px" viewBox="0 0 42 42" class="donut" xmlns="http://www.w3.org/2000/svg">
    <circle class="donutHole" cx="21" cy="21" r="15.91549430918954" fill="#ffffff"></circle>
    <circle class="donutRing" cx="21" cy="21" r="12.91549430918954" fill="transparent" stroke="#dddddd" stroke-width="3"></circle>
    <circle class="donutSegment" cx="21" cy="21" r="12.91549430918954" fill="transparent" stroke="#62C5C6" stroke-width="3" stroke-dasharray="${percentageIn} ${percentageInLeft}" stroke-dashoffset="-25"></circle>
    <circle class="donutRing" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#dddddd" stroke-width="3"></circle>
    <circle class="donutSegment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#24AEA2" stroke-width="3" stroke-dasharray="${percentageOut} ${percentageOutLeft}" stroke-dashoffset="-25"></circle>
  </svg>`;

  const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return image;
}

function drawGraph(graph) {
  console.log(JSON.stringify(graph));

  //Group edges for display
  const edges = [];
  const flowsIndex = {};

  for(let i=0; i<graph.edges.length; i+=1){
    const key = `${graph.edges[i].data.source}_${graph.edges[i].data.target}`;
    if(key in flowsIndex) {
      edges[flowsIndex[key]].data.created += graph.edges[i].data.created;
      edges[flowsIndex[key]].data.updated += graph.edges[i].data.updated;
      edges[flowsIndex[key]].data.deleted += graph.edges[i].data.deleted;
      edges[flowsIndex[key]].data.received += graph.edges[i].data.received;
      edges[flowsIndex[key]].data.numFlows += 1;
    } else {
      const length = edges.length;
      flowsIndex[key] = length;
      edges.push(graph.edges[i]);
      edges[length].data.numFlows = 1;
    }
  }

  for(let i=0; i<edges.length; i+=1){
    if(edges[i].data.numFlows === 0) {
      edges[i].data.width = 1;
    } else if(edges[i].data.numFlows < 10) {
      edges[i].data.width = edges[i].data.numFlows;
    } else {
      edges[i].data.width = 12;
    }
  }

  log.info('Edges:');
  log.info(edges);


  const elements = graph.nodes.concat(edges); // graph.edges

  // Collect flows of node
  nodeFlows = {};

  for(let i=0; i<graph.edges.length; i+=1){
    if(!(graph.edges[i].data.source in nodeFlows)) {
      nodeFlows[graph.edges[i].data.source] = { in: [], out: [], flowsIn: 0, flowsOut: 0 };
    }

    if(!(graph.edges[i].data.target in nodeFlows)) {
      nodeFlows[graph.edges[i].data.target] = { in: [], out: [], flowsIn: 0, flowsOut: 0 };
    }

    nodeFlows[graph.edges[i].data.source].out.push(`<div class="single-flow" title="${graph.edges[i].data.id}">${graph.edges[i].data.target}</div>`);
    nodeFlows[graph.edges[i].data.target].in.push(`<div class="single-flow" title="${graph.edges[i].data.id}">${graph.edges[i].data.source}</div>`);

    nodeFlows[graph.edges[i].data.source].flowsOut += 1;
    nodeFlows[graph.edges[i].data.target].flowsIn += 1;
  }

  // Calculate in / out ratio
  let maxIn = 0;
  let maxOut = 0;
  for(let i=0; i<graph.nodes.length; i+=1){
    if (graph.nodes[i].data.sent > maxOut) maxOut = graph.nodes[i].data.sent;
    if (graph.nodes[i].data.received > maxIn) maxIn = graph.nodes[i].data.received;
  }

  // Adding calculated data and charts to nodes
  for(let i=0; i<graph.nodes.length; i+=1){
    elements[i].data.image = drawRingChart(maxIn, maxOut, elements[i].data);
    if(elements[i].data.id in nodeFlows) {
      elements[i].data.nodeFlows = nodeFlows[elements[i].data.id];
    }
  }

  const html = `<html>
  <head>
    <title>Graph of flows</title>
    <link rel="stylesheet" href="${config.governanceServiceBaseUrl}/static/graph.css">
    <script type="text/javascript" src="${config.governanceServiceBaseUrl}/static/graph.js"></script>
    <style>
    </style>
    <script src="${config.governanceServiceBaseUrl}/static/cytoscape.min.js"></script>
  </head>
  <body>
  <div id="overlay">
    Gimme some data
  </div>
  <div id="graph"></div>
    <script>
      window.initGraph('graph', ${JSON.stringify(elements)});
      window.animateGraph();
    </script>
  </body>
</html>`;

  return html;
}

module.exports = {
  getRefs,
  getFlows,
  getObjectDistribution,
  getObjectDistributionAsGraph,
  checkFlows,
  drawGraph,
};
