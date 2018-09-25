'use strict'

// require our MongoDB-Model
const Flow = require('../../models/flow');
const log = require('../../config/logger');

// Retrieves all flows irrespective of ownership. Should only be available to internal methods or OIH-Admin.
const getAllFlows = () => {

  return new Promise(resolve => {
  Flow.find({})
  .then(doc => {
    resolve(doc);
  })
  .catch(err => {
    log.debug(err)
  });
});
};

// Retrieves a specific flow by oihid, irrespective of ownership. Should only be available to internal methods or OIH-Admin
const getAnyFlowById = (flowId) => {

  return new Promise(resolve => {

  Flow.find({oihid: flowId})
    .then( doc => {
      resolve(doc[0]);
    })
    .catch(err => {
      log.debug(err)
    });
});
};

const getFlows = (credentials) => {

  return new Promise(resolve => {
  Flow.find({
    "relationships.id": {$in: credentials}
  })
  .then(doc => {
    resolve(doc);
  })
  .catch(err => {
    log.debug(err)
  });
});
};

const getFlowsByUser = (relId, credentials) => {
  return new Promise(resolve => {

  Flow.find({
    $and: [
      {"relationships.id": {$in: [relId]}},
      {"relationships.type": "user"},
      {"relationships.id" : {$in: credentials}}
    ]
  })

  .then(doc => {
      resolve(doc);
  })
  .catch(err => {
    log.debug(err)
  });
});
};

const getFlowsByTenant = (relId, credentials) => {

  return new Promise(resolve => {

  Flow.find({
    $and: [
      {"relationships.id": {$in: [relId]}},
      {"relationships.type": "organisation"},
      {"relationships.id" : {$in: credentials}}
    ]
  })
  .then(doc => {
    resolve(doc);
  })
  .catch(err => {
    log.debug(err)
  });
});
};

const addFlow = (storeFlow) => {

  return new Promise(resolve => {

    storeFlow.save()
      .then(doc => {
        resolve(doc);
      })
      .catch(err => {
        log.debug(err)
      });
    });
};

const updateFlow = (storeFlow, credentials) => {

  return new Promise(resolve => {

  Flow.findOneAndUpdate({$and: [{oihid: storeFlow.oihid}, {"relationships.id": {$in: credentials}}] }, storeFlow,
    {upsert: false, new: true})
    .then(doc => {
      resolve(doc);
    })
    .catch(err => {
      log.debug(err)
    });
});
};


const getFlowById = (flowId, credentials) => {

  return new Promise(resolve => {

  Flow.find({$and: [{oihid: flowId}, {"relationships.id": {$in: credentials}}]})
    .then( doc => {
      resolve(doc[0]);
    })
    .catch(err => {
      log.debug(err)
    });
});
};


const deleteFlow = (flowId, credentials) => {

  return new Promise(resolve => {

  Flow.findOneAndRemove({
    $and:[
      {oihid: flowId},
      {"relationships.id": {$in: credentials}}
      ]
    })
  .then(response => {
    resolve(response)
  })
  .catch(err => {
    log.debug(err)
  });
});
};


// Adds a tenant to a flow by pushing it to its organisations array
const addTenantToFlow = (flowId, tenantId) => {

  return new Promise(resolve => {

  Flow.update(
    {oihid: flowId},
    {$push: {
      relationships: {
        id: tenantId,
        type: "organisation"
        }
      }
    }
  )
  .then(response => {
    resolve(response);
  })
  .catch(err => {
    log.debug(err)
  });
});

};

// Removes a tenant from a flow by popping the entry from its array
const deleteTenantFromFlow = (flowId, tenantId) => {

  return new Promise(resolve => {

  Flow.update(
    {oihid: flowId},
    {$pull: {
      relationships: {
        id: tenantId
        }
      }
    }
  )
  .then(response => {
    resolve(response);
  })
  .catch(err => {
    log.debug(err)
  });
});
};

const addNodeToFlow = (flowId, storeNode, credentials) => {


    return new Promise(resolve => {
      Flow.update(
        {$and: [{oihid: flowId}, {"relationships.id" : {$in: credentials}}]},
        {
            $push: {'graph.nodes':storeNode}

        }
      )
      .then(() =>{
        const res = getNodeById(flowId, storeNode.id, credentials);
        if (!res){
          resolve(false);
        }else{
          resolve(res);
        }
      })
      .catch(err => {
        log.debug(err);
      });
    });
};

const addEdgeToFlow = (flowId, storeEdge, credentials) => {

    return new Promise(resolve => {
      Flow.update(
        {$and: [{oihid: flowId}, {"relationships.id" : {$in: credentials}}]},
        {
            $push: {'graph.edges':storeEdge}

        }
      )
      .then(() => {
        const res = getEdgeById(flowId, storeEdge.id, credentials);
        if (!res){
          resolve(false);
        }else{
          resolve(res);
        }

      })
      .catch(err => {
        log.debug(err);
      });
    });
};

const updateNode = (flowId, storeNode, credentials) => {

  return new Promise(resolve => {

    const res = getEdgeById(flowId, storeNode.id, credentials);
    if (!res){
      resolve(false);
    }
    else{
      Flow.update(
        {$and:[
          {oihid: flowId},
          {"relationships.id": {$in: credentials}}
          ]
        },
        {$pull: {
          "graph.nodes": {
            id: storeNode.id
            }
          }
        }
      )
      .then(() => {

        Flow.update(
          {$and: [{oihid: flowId}, {"relationships.id" : {$in: credentials}}]},
          {
              $push: {'graph.nodes':storeNode}

          }
        )
        .then(() => {
          const res = getNodeById(flowId, storeNode.id, credentials);
          if (!res){
            resolve(false);
          }else{
            resolve(res);
          }

        });

      })
      .catch(err => {
        log.debug(err);
      });

    }

  });
};

const updateEdge = (flowId, storeEdge, credentials) => {


  return new Promise(resolve => {

    const res = getEdgeById(flowId, storeEdge.id, credentials);
    if (!res){
      resolve(false);
    }
    else{
      Flow.update(
        {$and:[
          {oihid: flowId},
          {"relationships.id": {$in: credentials}}
          ]
        },
        {$pull: {
          "graph.edges": {
            id: storeEdge.id
            }
          }
        }
      )
      .then(() => {

        Flow.update(
          {$and: [{oihid: flowId}, {"relationships.id" : {$in: credentials}}]},
          {
              $push: {'graph.edges':storeEdge}

          }
        )
        .then(() => {
          const res = getEdgeById(flowId, storeEdge.id, credentials);
          if (!res){
            resolve(false);
          }else{
            resolve(res);
          }

        });

      })
      .catch(err => {
        log.debug(err);
      });

    }

  });
};

const getNodeById = (flowId, nodeId, credentials) => {

  return new Promise(resolve => {

  var q = {$and: [{oihid: flowId}, {"graph.nodes.id": nodeId}, {"relationships.id": {$in: credentials}}]};

    Flow.find(q,
            {'graph.nodes': 1} )
    .then( doc => {
      if(0 in doc && 'graph' in doc[0]){
        let nl = doc[0].graph.nodes.length;
        let i;
        let nd = [];

        for(i=0;i<nl;++i){
          if('id' in doc[0].graph.nodes[i] && doc[0].graph.nodes[i].id == nodeId){
            nd = doc[0].graph.nodes[i];
            break;
          }
        }
        resolve(nd.toObject());
      }else{
        resolve(false);
      }

    })
    .catch(err => {
      log.debug(err)
    });
  });
};

const getEdgeById = (flowId, edgeId, credentials) => {

  return new Promise(resolve => {

  var q = {$and: [{oihid: flowId}, {"graph.edges.id": edgeId}, {"relationships.id": {$in: credentials}}]};

    Flow.find(q,
            {'graph.edges': 1} )
    .then( doc => {
      if(0 in doc && 'graph' in doc[0]){
        let nl = doc[0].graph.edges.length;
        let i;
        let nd = [];

        for(i=0;i<nl;++i){
          if('id' in doc[0].graph.edges[i] && doc[0].graph.edges[i].id == edgeId){
            nd = doc[0].graph.edges[i];
            break;
          }
        }
        resolve(nd.toObject());
      }else{
        resolve(false);
      }

    })
    .catch(err => {
      log.debug(err)
    });
  });
};

const deleteNode = (flowId, nodeId, credentials) => {

  return new Promise(resolve => {
    const res = getNodeById(flowId, nodeId, credentials);
    if (!res){
      resolve(false);
    }
    else{
      Flow.update(
        {$and:[
          {oihid: flowId},
          {"relationships.id": {$in: credentials}}
          ]
        },
        {$pull: {
          "graph.nodes": {
            id: nodeId
            }
          }
        }
      )
      .then(() => {
        resolve(res);
      })
      .catch(err => {
        log.debug(err);
      });

    }




});
};

// Deltes an edge from a flow by pulling it from the edges array
const deleteEdge = (flowId, edgeId, credentials) => {

  return new Promise(resolve => {
    const res = getEdgeById(flowId, edgeId, credentials);
    if (!res){
      resolve(false);
    }else{
      Flow.update(
        {$and:[
          {oihid: flowId},
          {"relationships.id": {$in: credentials}}
          ]
        },
        {$pull: {
          "graph.edges": {
            id: edgeId
            }
          }
        }
      )
      .then(() => {
        resolve(res);
      })
      .catch(err => {
        log.debug(err)
      });
  }
});
};


module.exports = {
    getAllFlows,
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
    deleteEdge
};
