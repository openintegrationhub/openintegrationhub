/* eslint no-use-before-define: "off" */

// require our MongoDB-Model
const Flow = require('../../models/flow');
const log = require('../../config/logger');

// Retrieves all flows for authorized owner or for admin irrespective of ownership.

const getFlows = async ( // eslint-disable-line
  credentials,
  pageSize,
  pageNumber,
  searchString,
  filters,
  sortField,
  sortOrder,
) => new Promise(async (resolve) => {
  const qry = {};

  if (credentials !== false) {
    qry.$or = [
      { workspaceId: { $in: credentials } },
      { userId: { $in: credentials } },
    ];
  }

  // Add all filtered fields to query
  const filterFields = Object.keys(filters);
  const length = filterFields.length;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      qry[filterFields[i]] = filters[filterFields[i]];
    }
  }

  if (searchString !== '') {
    const rx = new RegExp(searchString);
    qry.$or = [
      {
        name: {
          $regex: rx,
        },
      },
      {
        description: {
          $regex: rx,
        },
      },
    ];
  }

  // , sortField, sortOrder
  const sort = {};
  sort[sortField] = sortOrder;

  // count results
  const count = await Flow.find(qry).estimatedDocumentCount();

  // add offset and limit to query and execute
  Flow.find(qry).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize)
    .lean()
    .then((doc) => {
      resolve({ data: doc, meta: { total: count } });
    })
    .catch((err) => {
      log.debug(err);
    });
});

// Retrieves a specific flow by oihid, irrespective of ownership.
// Should only be available to internal methods or OIH-Admin
const getAnyFlowById = flowId => new Promise((resolve) => {
  Flow.find({ oihid: flowId })
    .then((doc) => {
      resolve(doc[0]);
    })
    .catch((err) => {
      log.debug(err);
    });
});


const getFlowsByUser = (relId, credentials) => new Promise((resolve) => {
  Flow.find({
    $and: [
      { 'relationships.id': { $in: [relId] } },
      { 'relationships.type': 'user' },
      { 'relationships.id': { $in: credentials } },
    ],
  })

    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});

const getFlowsByTenant = (relId, credentials) => new Promise((resolve) => {
  Flow.find({
    $and: [
      { workspaceId: { $in: credentials } },
    ],
  })
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});

const addFlow = storeFlow => new Promise((resolve) => {
  storeFlow.save()
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});

const updateFlow = (storeFlow, credentials) => new Promise((resolve) => {
  Flow.findOneAndUpdate({
    $and: [{ oihid: storeFlow.oihid }, {
      $or: [
        { workspaceId: { $in: credentials } },
        { userId: { $in: credentials } },
      ],
    }],
  }, storeFlow,
  { upsert: false, new: true })
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});


const getFlowById = (flowId, credentials) => new Promise((resolve) => {
  Flow.findOne({
    $and: [{ oihid: flowId }, {
      $or: [
        { workspaceId: { $in: credentials } },
        { userId: { $in: credentials } },
      ],
    }],
  }).lean()
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});


const deleteFlow = (flowId, credentials) => new Promise((resolve) => {
  Flow.findOneAndRemove({
    $and: [
      { oihid: flowId },
      {
        $or: [
          { workspaceId: { $in: credentials } },
          { userId: { $in: credentials } },
        ],
      },
    ],
  })
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.debug(err);
    });
});


// Adds a tenant to a flow by pushing it to its organisations array
const addTenantToFlow = (flowId, tenantId) => new Promise((resolve) => {
  Flow.update(
    { oihid: flowId },
    {
      $push: {
        relationships: {
          id: tenantId,
          type: 'organisation',
        },
      },
    },
  )
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.debug(err);
    });
});

// Removes a tenant from a flow by popping the entry from its array
const deleteTenantFromFlow = (flowId, tenantId) => new Promise((resolve) => {
  Flow.update(
    { oihid: flowId },
    {
      $pull: {
        relationships: {
          id: tenantId,
        },
      },
    },
  )
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.debug(err);
    });
});

const addNodeToFlow = (flowId, storeNode, credentials) => new Promise((resolve) => {
  Flow.update(
    {
      $and: [{ oihid: flowId }, {
        $or: [
          { workspaceId: { $in: credentials } },
          { userId: { $in: credentials } },
        ],
      }],
    },
    {
      $push: { 'graph.nodes': storeNode },

    },
  )
    .then(() => {
      const res = getNodeById(flowId, storeNode.id, credentials);
      if (!res) {
        resolve(false);
      } else {
        resolve(res);
      }
    })
    .catch((err) => {
      log.debug(err);
    });
});

const addEdgeToFlow = (flowId, storeEdge, credentials) => new Promise((resolve) => {
  Flow.update(
    {
      $and: [{ oihid: flowId }, {
        $or: [
          { workspaceId: { $in: credentials } },
          { userId: { $in: credentials } },
        ],
      }],
    },
    {
      $push: { 'graph.edges': storeEdge },

    },
  )
    .then(() => {
      const res = getEdgeById(flowId, storeEdge.id, credentials);
      if (!res) {
        resolve(false);
      } else {
        resolve(res);
      }
    })
    .catch((err) => {
      log.debug(err);
    });
});

const updateNode = (flowId, storeNode, credentials) => new Promise((resolve) => {
  const res = getEdgeById(flowId, storeNode.id, credentials);
  if (!res) {
    resolve(false);
  } else {
    Flow.update(
      {
        $and: [
          { oihid: flowId },
          {
            $or: [
              { workspaceId: { $in: credentials } },
              { userId: { $in: credentials } },
            ],
          },
        ],
      },
      {
        $pull: {
          'graph.nodes': {
            id: storeNode.id,
          },
        },
      },
    )
      .then(() => {
        Flow.update(
          {
            $and: [{ oihid: flowId }, {
              $or: [
                { workspaceId: { $in: credentials } },
                { userId: { $in: credentials } },
              ],
            }],
          },
          {
            $push: { 'graph.nodes': storeNode },

          },
        )
          .then(() => {
            const response = getNodeById(flowId, storeNode.id, credentials);
            if (!response) {
              resolve(false);
            } else {
              resolve(response);
            }
          });
      })
      .catch((err) => {
        log.debug(err);
      });
  }
});

const updateEdge = (flowId, storeEdge, credentials) => new Promise((resolve) => {
  const res = getEdgeById(flowId, storeEdge.id, credentials);
  if (!res) {
    resolve(false);
  } else {
    Flow.update(
      {
        $and: [
          { oihid: flowId },
          {
            $or: [
              { workspaceId: { $in: credentials } },
              { userId: { $in: credentials } },
            ],
          },
        ],
      },
      {
        $pull: {
          'graph.edges': {
            id: storeEdge.id,
          },
        },
      },
    )
      .then(() => {
        Flow.update(
          { $and: [{ oihid: flowId }, { 'relationships.id': { $in: credentials } }] },
          {
            $push: { 'graph.edges': storeEdge },

          },
        )
          .then(() => {
            const response = getEdgeById(flowId, storeEdge.id, credentials);
            if (!response) {
              resolve(false);
            } else {
              resolve(response);
            }
          });
      })
      .catch((err) => {
        log.debug(err);
      });
  }
});

const getNodeById = (flowId, nodeId, credentials) => new Promise((resolve) => {
  const q = {
    $and: [{ oihid: flowId }, { 'graph.nodes.id': nodeId }, {
      $or: [
        { workspaceId: { $in: credentials } },
        { userId: { $in: credentials } },
      ],
    }],
  };

  Flow.find(q,
    { 'graph.nodes': 1 })
    .then((doc) => {
      if (0 in doc && 'graph' in doc[0]) {
        const nl = doc[0].graph.nodes.length;
        let i;
        let nd = [];

        for (i = 0; i < nl; i += 1) {
          if ('id' in doc[0].graph.nodes[i] && doc[0].graph.nodes[i].id === nodeId) {
            nd = doc[0].graph.nodes[i];
            break;
          }
        }
        resolve(nd.toObject());
      } else {
        resolve(false);
      }
    })
    .catch((err) => {
      log.debug(err);
    });
});

const getEdgeById = (flowId, edgeId, credentials) => new Promise((resolve) => {
  const q = { $and: [{ oihid: flowId }, { 'graph.edges.id': edgeId }, { 'relationships.id': { $in: credentials } }] };

  Flow.find(q,
    { 'graph.edges': 1 })
    .then((doc) => {
      if (0 in doc && 'graph' in doc[0]) {
        const nl = doc[0].graph.edges.length;
        let i;
        let nd = [];

        for (i = 0; i < nl; i += 1) {
          if ('id' in doc[0].graph.edges[i] && doc[0].graph.edges[i].id === edgeId) {
            nd = doc[0].graph.edges[i];
            break;
          }
        }
        resolve(nd.toObject());
      } else {
        resolve(false);
      }
    })
    .catch((err) => {
      log.debug(err);
    });
});

const deleteNode = (flowId, nodeId, credentials) => new Promise((resolve) => {
  const res = getNodeById(flowId, nodeId, credentials);
  if (!res) {
    resolve(false);
  } else {
    Flow.update(
      {
        $and: [
          { oihid: flowId },
          {
            $or: [
              { workspaceId: { $in: credentials } },
              { userId: { $in: credentials } },
            ],
          },
        ],
      },
      {
        $pull: {
          'graph.nodes': {
            id: nodeId,
          },
        },
      },
    )
      .then(() => {
        resolve(res);
      })
      .catch((err) => {
        log.debug(err);
      });
  }
});

// Deltes an edge from a flow by pulling it from the edges array
const deleteEdge = (flowId, edgeId, credentials) => new Promise((resolve) => {
  const res = getEdgeById(flowId, edgeId, credentials);
  if (!res) {
    resolve(false);
  } else {
    Flow.update(
      {
        $and: [
          { oihid: flowId },
          {
            $or: [
              { workspaceId: { $in: credentials } },
              { userId: { $in: credentials } },
            ],
          },
        ],
      },
      {
        $pull: {
          'graph.edges': {
            id: edgeId,
          },
        },
      },
    )
      .then(() => {
        resolve(res);
      })
      .catch((err) => {
        log.debug(err);
      });
  }
});


module.exports = {
  getAnyFlowById,
  getFlows,
  addFlow,
  updateFlow,
  getFlowById,
  deleteFlow,
  addTenantToFlow,
  deleteTenantFromFlow,
  getFlowsByUser,
  getFlowsByTenant,
  getNodeById,
  addNodeToFlow,
  updateNode,
  deleteNode,
  getEdgeById,
  addEdgeToFlow,
  updateEdge,
  deleteEdge,
};
