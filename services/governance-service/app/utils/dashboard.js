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

function drawGraph(graph) {
  const elements = graph.nodes.concat(graph.edges);

  const html = `<html>
  <head>
    <title>Graph of flows</title>
    <style>
        #graph {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0px;
            left: 0px;
            z-index: 999;
        }
        #overlay {
          width: 100px;
          height: 200px;
          max-width: 0px;
          max-height: 0px;
          background-color: #fff;
          box-shadow: 0 18px 38px rgba(0,0,0,0.30), 0 14px 12px rgba(0,0,0,0.20);
          border-radius: 2px;
          padding: 0px;
          overflow: hidden;
          position: absolute;
          z-index: 100000;
          transition: 0.25s ease-in;
        }

        #overlay.show {
          max-width: 100px;
          max-height: 200px;
          padding: 15px;
          transition: 0.25s ease-in;
        }
    </style>
    <script src="${config.governanceServiceBaseUrl}/static/cytoscape.min.js"></script>
  </head>
  <body>
  <div id="overlay">
    Gimme some data
  </div>
  <div id="graph"></div>
    <script>
      // @todo: get graph data from api
      var apiUrl = '${config.governanceServiceBaseUrl}/dashboard/graph';

      var graph = cytoscape({
        container: document.getElementById('graph'),
        elements: ${JSON.stringify(elements)},
          style: [
            {
              selector: 'node',
              css: {
                // shape: 'round-rectangle',
                shape: 'circle',
                width: 100,
                height: 100,
                //'background-color':'#61bffc',
                'background-color':'#fffff',
                'background-image': 'data(image)',
                //'background-fit': 'cover',
                //'background-width': 50,
                //'background-height': 10,
                //'background-position-x': 5,
                content: 'data(name)',
                'text-valign': 'center',
                'text-halign': 'center',
                'border-width': 1,
                'border-opacity': 0.0,
                //'border-width': 4,
                //'border-style': 'solid',
                //'border-color': '#51afec',
                //'border-opacity': 0.9,

              },
            },
            {
              selector: 'edge',
              css: {
                'line-color':'#ddd',
                'line-style': 'dashed',
                'line-dash-offset': 0,
                'line-dash-pattern': [4, 4],
                'curve-style': 'bezier', // 'taxi',
              }
            },
            {
              selector: 'label',
              css: {
                // color: '#fff',
                color: '#666',
                'font-size': '10',
              }
            }
          ],
          layout: {
            name: 'cose', // grid
            directed: false,
            padding: 10,
            fit: true
        }
      });


      // Add extra info


      // Handle clicks
      graph.on('click', '*', function(event){
        var overlay = document.getElementById('overlay');
        overlay.classList.remove('show');
      });

      graph.on('click', 'node', function(event){
        var overlay = document.getElementById('overlay');
        overlay.classList.remove('show');
        console.log(event);
        console.log("Click on:" + event.target.data("name"));
        console.log('x:', event.renderedPosition.x);
        console.log('y:', event.renderedPosition.y);

        //overlay
        overlay.style.left = event.renderedPosition.x;
        overlay.style.top = event.renderedPosition.y;
        overlay.classList.add('show');
      });

      // Animation
      var offset = 0;
      function animate() {
        offset += 0.2
        graph.edges().animate({
          style: {'line-dash-offset': -offset}
        });
        requestAnimationFrame(animate);
      }

      graph.ready(() => {
        animate()
      });

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
