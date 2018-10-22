'use strict'
//const path = require('path');
//const _ = require('lodash');
const config = require('config');
const storage = require('./' + config.get('storage'));
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger');

// require our MongoDB-Model
const Flow = require('../../models/flow');

// Gets all flows
router.get('/', jsonParser, async (req, res) => {

  const credentials = res.locals.credentials[1];
  let response;

  if(res.locals.admin){
    response = await storage.getAllFlows();
  }
  else{
    response = await storage.getFlows(credentials);
  }

  if(response.length == 0){
    res.status(404).send('No flows found');
  }
  else{
    res.json(response);
  }

});


// Adds a new flow to the repository
router.post('/', jsonParser, async (req, res) => {

    const newFlow = req.body;
    const credentials = res.locals.credentials[0];
    const now = new Date();
    const timestamp = now.toString();

    // checks whether oihid is unique
    const testFlow = await storage.getAnyFlowById(newFlow.oihid);
    if(testFlow){
      res.status(409).send('Flow with this ID already exists');
    }
    else{
    let storeFlow = new Flow({
      type: newFlow.type,
      oihid: newFlow.oihid,
      links: {self: "/api/flow/" + newFlow.oihid},
      attributes: {
        name: newFlow.name,
        status: newFlow.status,
        current_status: newFlow.current_status,
        default_mapper_type: newFlow.default_mapper_type,
        description: newFlow.description,
        updated_at: timestamp,
        versions: [{name: 1, date: timestamp}],
        latest_version: {name: 1, date: timestamp}
      },
      relationships: {
          id: credentials[0],
          type: 'user'
        }
    });

    const response = await storage.addFlow(storeFlow);
    res.json(response);
    }

});

// Updates a flow with body data
router.put('/', jsonParser, async (req, res) => {
  const updateFlow = req.body;
  const credentials = res.locals.credentials[0];



  // Get the flow to retrieve the updated version and version history
  const oldFlow = await storage.getFlowById (updateFlow.oihid, credentials)
  if(!oldFlow){
    res.status(404).send('Flow not found');
  }
  else{
    // Updates the version history and timestamp, without output
    await updateVersion(updateFlow.oihid, credentials);


    let storeFlow = {
      type: updateFlow.type,
      oihid: updateFlow.oihid,
      links: oldFlow.links,
      attributes: {
        name: updateFlow.name,
        status: updateFlow.status,
        current_status: updateFlow.current_status,
        default_mapper_type: updateFlow.default_mapper_type,
        description: updateFlow.description,
        updated_at: oldFlow.attributes.updated_at,
        latest_version: oldFlow.attributes.latest_version,
        versions: oldFlow.attributes.versions
      },
      relationships: oldFlow.relationships,
      graph: oldFlow.graph
    };

    const response = await storage.updateFlow(storeFlow, credentials)

    if (!response){
        res.status(404).send('Flow not found');
      }
      else{
        res.json(response);
      }
    }
  });

  // Gets flows by user
  router.get('/user/:relationid', jsonParser, async (req, res) => {

    const relId = req.params.relationid;
    const credentials = res.locals.credentials[1];

    if(relId != credentials[0]){
      res.status(401).send('Unauthorised: Cannot Get flows from users other than yourself');
    }
    else{
      const response = await storage.getFlowsByUser(relId, credentials);

      if (!response || response.length == 0){
        res.status(404).send('No flows found');
      }
      else{
        res.json(response);
      }
    }

  });

  // Gets flows by tenant
  router.get('/tenant/:relationid', jsonParser, async (req, res) => {

    const relId = req.params.relationid;
    const credentials = res.locals.credentials[1];

    if (!credentials.includes(relId)) {
      res.status(401).send('Unauthorised: Cannot Get flows of tenants you are not a member of');
    }
    else{

      const response = await storage.getFlowsByTenant(relId, credentials);

      if (!response || response.length == 0){
        res.status(404).send('No flows found');
      }
      else{
        res.json(response);
      }
    }
  });

// Gets a flow by oihid
router.get('/:oihid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const credentials = res.locals.credentials[1];
  let response;

  if(res.locals.admin){
    response = await storage.getAnyFlowById(flowId);
  }
  else{
    response = await storage.getFlowById(flowId, credentials);
  }

  if (!response){
    res.status(404).send('No flows found');
  }
  else{
    res.json(response);
  }

});

// Updates a flow wih form data
router.post('/:oihid', urlParser, async (req, res) => {
  const flowId = req.params.oihid;
  const credentials = res.locals.credentials[0];


  // Updates the version and version history
  await updateVersion(flowId, credentials);

  // Get the flow to retrieve the new version and version history
  const oldFlow = await storage.getFlowById (flowId, credentials)
  if(!oldFlow){
    res.status(404).send('Flow not found');
  }


  const storeFlow = {
    type: oldFlow.type,
    oihid: flowId,
    links: oldFlow.links,
    attributes: {
      name: req.body.name,
      status: req.body.status,
      current_status: req.body.current_status,
      default_mapper_type: oldFlow.attributes.default_mapper_type,
      description: oldFlow.attributes.description,
      updated_at: oldFlow.attributes.updated_at,
      latest_version: oldFlow.attributes.latest_version,
      versions: oldFlow.attributes.versions
    },
    relationships: oldFlow.relationships,
    graph: oldFlow.graph
  };

  const response = await storage.updateFlow(storeFlow, credentials)

  if (!response){
      res.status(404).send('Flow not found');
    }
    else{
      res.json(response);
    }

});

// Deletes a flow
router.delete('/:oihid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const credentials = res.locals.credentials[0];

  const response = await storage.deleteFlow(flowId, credentials);

  if (!response){
    res.status(404).send('Flow not found');
  }
  else{
    res.json(response);
  }

});


// Adds a tenant to a flow by pushing it to its organisations array
router.post('/tenant/:oihid/:tenantid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const tenantId = req.params.tenantid;
  const credentials = res.locals.credentials[0];

  // Checks whether flow already has this tenant
  let alreadyExists = false;

  const oldFlow = await storage.getFlowById(flowId, credentials);

  if(!oldFlow){
    res.status(404).send('Flow not found');
  }
else{

  for (let i=0; i < oldFlow.relationships.length; i++){
    if (oldFlow.relationships[i].type == 'organisation' || oldFlow.relationships[i].id == tenantId){
      alreadyExists = true;
    }
  }

  if (!credentials.includes(tenantId)) {
    res.status(401).send('Unauthorised: Cannot associate flow with a tenant you are not an admin or integrator of');
  }
  else if(alreadyExists){
    res.status(409).send('Flow is already associated with this tenant');
  }

  else{

    // updates flow version and version history
    await updateVersion(flowId, credentials);

    const response = await storage.addTenantToFlow(flowId, tenantId);

    if(response.n == 0) {
      res.status(404).send('Flow not found');
    }
    else if (response.nModified >= 1){
      res.status(200).send('Successfully added tenant to flow');
    }
    else {
      res.status(500).send('Could not add tenant to flow');
    }
}
}
});

// Removes a tenant from a flow by pulling the entry from its array
router.delete('/tenant/:oihid/:tenantid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const tenantId = req.params.tenantid;
  const credentials = res.locals.credentials[0];


  if (!credentials.includes(tenantId)) {
    res.status(401).send('Unauthorised: Cannot remove flow from a tenant you are not an admin or integrator of');
  }
  else{



    const oldFlow = await storage.getFlowById(flowId, credentials);
    let alreadyExists = false;
    if(!oldFlow){
      res.status(404).send('Flow not found');
    }
    else{
      // updates flow version and version history
      await updateVersion(flowId, credentials);

      for (let i=0; i < oldFlow.relationships.length; i++){
        if (oldFlow.relationships[i].type == 'organisation' || oldFlow.relationships[i].id == tenantId){
          alreadyExists = true;
        }
      }

      if(!alreadyExists){
        res.status(409).send('Flow is not associated with this tenant');
      }else{

      const response = await storage.deleteTenantFromFlow(flowId, tenantId);


        if(response.n == 0) {
          res.status(404).send('Flow not found');
        }
        else if(response.nModified >= 1) {
          res.status(200).send('Successfully removed tenant from flow');
        }
        else {
          res.status(500).send('Could not remove tenant from flow');
        }
      }
    }
  }

});

router.post('/node/:oihid/:nodeid', urlParser, async (req, res) => {

  const flowId = req.params.oihid;
  const nodeId = req.params.nodeid;
  const newNode = req.body;
  const credentials = res.locals.credentials[0];

  // updates flow version and version history
  await updateVersion(flowId, credentials);

  let storeNode = {
    id: nodeId,
    command: newNode.command,
    name: newNode.name,
    description: newNode.description,
    fields: [{interval: newNode.fields_interval}],
  };

  const response = await storage.addNodeToFlow(flowId, storeNode, credentials);

  if(!response){
    res.status(405).send('Invalid input');
  }else{
    res.json(response);
  }

});

router.post('/edge/:oihid/:edgeid', urlParser, async (req, res) => {

  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const newEdge = req.body;
  const credentials = res.locals.credentials[0];

  // updates flow version and version history
  await updateVersion(flowId, credentials);

  let storeEdge = {
    id: edgeId,
    config: {
      mapper_type: newEdge.mapper_type,
      condition: newEdge.condition,
      mapper: {
              to: newEdge.mapper_to,
              subject: newEdge.mapper_subject,
              textbody: newEdge.mapper_textbody,
            },
      source: newEdge.source,
      target: newEdge.target,
    }
  };


  const response = await storage.addEdgeToFlow(flowId, storeEdge, credentials);
  if(!response){
    res.status(405).send('Invalid input');
  }else{
    res.json(response);
  }

});

router.put('/node/:oihid/:nodeid', urlParser, async (req, res) => {

    const flowId = req.params.oihid;
    const nodeId = req.params.nodeid;
    const newNode = req.body;
    const credentials = res.locals.credentials[0];

    let fields;

    // Get the current nodedata
    const oldNode = await storage.getNodeById(flowId, nodeId, credentials)
    if(!oldNode){
      res.status(404).send('Node not found');
    }
    else {
      // updates flow version and version history
      await updateVersion(flowId, credentials);
      let fl = oldNode.fields.length;
      if(fl>0){
        fields = oldNode.fields;
        let i;
        for(i=0;i<fl;++i){
          if('interval' in fields[i]){
            fields[i].interval = newNode.fields_interval;
          }
        }
      }else{
        fields = [{interval: newNode.fields_interval}];
      }
    }

    let storeNode = {
      id: nodeId,
      command: newNode.command,
      name: newNode.name,
      description: newNode.description,
      fields: fields,
    };

    const response = await storage.updateNode(flowId, storeNode, credentials);

    if (!response){
      res.status(404).send('Node not found');
    }else{
      res.json(response);
    }

});

router.put('/edge/:oihid/:edgeid', urlParser, async (req, res) => {

  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const newEdge = req.body;
  const credentials = res.locals.credentials[0];


  const oldNode = await storage.getEdgeById(flowId, edgeId, credentials)
  if(!oldNode){
    res.status(404).send('Edge not found');
  }
  else {
  // updates flow version and version history
  await updateVersion(flowId, credentials);

  let storeEdge = {
    id: edgeId,
    config: {
      mapper_type: newEdge.mapper_type,
      condition: newEdge.condition,
      mapper: {
              to: newEdge.mapper_to,
              subject: newEdge.mapper_subject,
              textbody: newEdge.mapper_textbody,
            },
      source: newEdge.source,
      target: newEdge.target,
    }
  };

  const response = await storage.updateEdge(flowId, storeEdge, credentials);

  if (!response){
    res.status(404).send('Edge not found');
  }else{
    res.json(response);
  }
}

});

router.get('/node/:oihid/:nodeid', jsonParser, async (req, res) => {

  const flowId = req.params.oihid;
  const nodeId = req.params.nodeid;
  const credentials = res.locals.credentials[1];

  const response = await storage.getNodeById(flowId, nodeId, credentials);

  if (!response){
    res.status(404).send('Node not found');
  }
  else{
    res.json(response);
  }

});

router.get('/edge/:oihid/:edgeid', jsonParser, async (req, res) => {

  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const credentials = res.locals.credentials[1];

  const response = await storage.getEdgeById(flowId, edgeId, credentials);

  if (!response){
    res.status(404).send('Edge not found');
  }
  else{
    res.json(response);
  }

});

router.delete('/node/:oihid/:nodeid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const nodeId = req.params.nodeid;
  const credentials = res.locals.credentials[0];

  // updates flow version and version history
  await updateVersion(flowId, credentials);

  const response = await storage.deleteNode(flowId, nodeId, credentials);

  if (!response){
    res.status(404).send('Node not found');
  }
  else{
    res.json(response);
  }

});

router.delete('/edge/:oihid/:edgeid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const credentials = res.locals.credentials[0];

  // updates flow version and version history
  await updateVersion(flowId, credentials);

  const response = await storage.deleteEdge(flowId, edgeId, credentials);

  if (!response){
    res.status(404).send('Edge not found');
  }
  else{
    res.json(response);
  }

});

// Intermediate function to automatically update the current version and version history
const updateVersion = async (flowId, credentials) => {
  /*eslint-disable */
  return new Promise(async resolve => {
    const now = new Date();
    const timestamp = now.toString();

    let currentVer;
    let verHistory;

    // Get the flow to retrieve the current version and version history
    let oldFlow = await storage.getFlowById (flowId, credentials)
    if(!oldFlow){
      log.debug('Flow not found');
    }
    else {
      currentVer = oldFlow.attributes.latest_version;
      verHistory = oldFlow.attributes.versions;
    }

    // Update the version and version history
    const newVer = {name: (currentVer.name + 1), date: timestamp};
    verHistory.unshift(newVer);

    oldFlow.attributes.latest_version = newVer;
    oldFlow.attributes.versions = verHistory;
    oldFlow.attributes.updated_at = timestamp;

    const response = await storage.updateFlow(oldFlow, credentials)
    .catch(function (err){
      log.debug('Error while updating versions: ' + err);
    });

    resolve(true);
  });
  /*eslint-enable */

}

module.exports = router;
