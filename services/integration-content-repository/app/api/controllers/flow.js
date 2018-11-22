/* eslint no-underscore-dangle: "off" */
// const path = require('path');
// const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const uniqid = require('uniqid');
const config = require('../../config/index');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// require our MongoDB-Model
const Flow = require('../../models/flow');

// Gets all flows
router.get('/', jsonParser, async (req, res) => {
  const credentials = res.locals.credentials[1];
  let response;
  let error = false;

  let pageSize = 10;
  let pageNumber = 1;

  const filters = {};
  const filterTypes = { createdAt: 1, updatedAt: 1, name: 1 };

  let searchString = '';

  const sortableFields = { ordinary: 1, long_running: 1 };
  let sortField = 'id';
  let sortOrder = '-1';

  // page[size]
  if (req.query.page && (req.query.page.size !== undefined && pageSize > 1)) {
    pageSize = String(parseInt(req.query.page.size, 10));
  }
  // page[number]
  if (req.query.page && (req.query.page.number !== undefined && pageNumber > 0)) {
    pageNumber = String(parseInt(req.query.page.number, 10));
  }

  // filter[has_draft] 1 0
  if (req.query.filter && (req.query.filter.has_draft !== undefined)) {
    if (req.query.filter.has_draft === '1' || req.query.filter.has_draft === '0') {
      // filters.has_draft = req.query.filter.has_draft;
      res.end(404).send('Filter parameter not implemented yet needs clarification of purpose');
      return;
    }
    res.end(404).send('Invalid filter[has_draft] parameter');
    return;
  }

  // filter[status] 1 0
  if (req.query.filter && req.query.filter.status !== undefined) {
    if (req.query.filter.status === '1' || req.query.filter.status === '0') {
      filters.status = req.query.filter.status;
    } else {
      res.end(404).send('Invalid filter[status] parameter');
      return;
    }
  }

  // filter[type] (ordinary, long_running)
  if (req.query.filter && req.query.filter.type !== undefined) {
    if (req.query.filter.type in filterTypes) {
      filters.type = req.query.filter.type;
    } else {
      res.end(404).send('Invalid filter[type] parameter');
      return;
    }
  }

  // filter[user]
  if (req.query.filter && req.query.filter.user !== undefined) {
    filters.userId = String(parseInt(req.query.filter.user, 10));
  }

  // sort createdAt, updatedAt and name,  Prefix -
  if (req.query.sort !== undefined) {
    const array = req.query.sort.split('-');
    if (array.length === 1) {
      sortField = array[0];
      sortOrder = '1';
    } else if (array.length === 2) {
      sortField = array[1];
      sortOrder = '-1';
    } else {
      error = true;
    }
    if (!(sortField in sortableFields)) error = true;

    if (error) {
      res.end(404).send('Invalid sort parameter');
      return;
    }
  }

  // search
  if (req.query.search !== undefined) {
    searchString = req.query.filter.type.replace(/[^a-z0-9\p{L}\-_\s]/img, '');
    searchString = searchString.replace(/(^[\s]+|[\s]$)/img, '');
  }

  if (res.locals.admin) {
    response = await storage.getFlows(false, pageSize, pageNumber, searchString, filters, sortField, sortOrder); // eslint-disable-line
  } else {
    response = await storage.getFlows(credentials, pageSize, pageNumber, searchString, filters, sortField, sortOrder); // eslint-disable-line
  }

  if (response.data.length === 0) {
    res.status(404).send('No flows found');
  } else {
    response.meta.page = pageNumber;
    response.meta.perPage = pageSize;
    response.meta.totalPages = response.meta.total / pageSize;
    res.json(response);
  }
});

// Adds a new flow to the repository
router.post('/', jsonParser, async (req, res) => {
  const newFlow = req.body;
  const credentials = res.locals.credentials[0];
  const now = new Date();
  const timestamp = now.toString();
  const id = uniqid();

  newFlow.oihid = id;
  newFlow.createdAt = timestamp;
  newFlow.updatedAt = timestamp;
  newFlow.userId = credentials[0];

  const storeFlow = new Flow(newFlow);

  try {
    const response = await storage.addFlow(storeFlow);
    res.status(200).send(response);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Updates a flow with body data
router.put('/', jsonParser, async (req, res) => {
  const updateData = req.body;
  const credentials = res.locals.credentials[0];
  const now = new Date();
  const timestamp = now.toString();

  // Get the flow to retrieve the updated version and version history
  const oldFlow = await storage.getFlowById(updateData.oihid, credentials);
  if (!oldFlow) {
    res.status(404).send('Flow not found');
  } else {
    const updateFlow = Object.assign(oldFlow, updateData);
    updateFlow.updatedAt = timestamp;

    const storeFlow = new Flow(updateFlow);

    try {
      const response = await storage.updateFlow(storeFlow, credentials);
      if (!response) {
        res.status(404).send('Flow not found');
      } else {
        res.status(200).send(response);
      }
    } catch (err) {
      res.status(500).send(err);
    }
  }
});

// Gets flows by user
router.get('/user/:relationid', jsonParser, async (req, res) => {
  const relId = req.params.relationid;
  const credentials = res.locals.credentials[1];

  if (relId !== credentials[0]) {
    res.status(401).send('Unauthorised: Cannot Get flows from users other than yourself');
  } else {
    const response = await storage.getFlowsByUser(relId, credentials);

    if (!response || response.length === 0) {
      res.status(404).send('No flows found');
    } else {
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
  } else {
    const response = await storage.getFlowsByTenant(relId, credentials);

    if (!response || response.length === 0) {
      res.status(404).send('No flows found');
    } else {
      res.json(response);
    }
  }
});

// Gets a flow by oihid
router.get('/:oihid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const credentials = res.locals.credentials[1];
  let response;

  if (res.locals.admin) {
    response = await storage.getAnyFlowById(flowId);
  } else {
    response = await storage.getFlowById(flowId, credentials);
  }

  if (!response) {
    res.status(404).send('No flows found');
  } else {
    res.json(response);
  }
});

// Updates a flow wih form data
router.post('/:oihid', urlParser, async (req, res) => {
  const flowId = req.params.oihid;
  const credentials = res.locals.credentials[0];


  // Get the flow to retrieve the new version and version history
  const oldFlow = await storage.getFlowById(flowId, credentials);
  if (!oldFlow) {
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
      versions: oldFlow.attributes.versions,
    },
    relationships: oldFlow.relationships,
    graph: oldFlow.graph,
  };

  const response = await storage.updateFlow(storeFlow, credentials);

  if (!response) {
    res.status(404).send('Flow not found');
  } else {
    res.json(response);
  }
});

// Deletes a flow
router.delete('/:oihid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const credentials = res.locals.credentials[0];

  const response = await storage.deleteFlow(flowId, credentials);

  if (!response) {
    res.status(404).send('Flow not found');
  } else {
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

  if (!oldFlow) {
    res.status(404).send('Flow not found');
  } else {
    for (let i = 0; i < oldFlow.relationships.length; i += 1) {
      if (oldFlow.relationships[i].type === 'organisation' || oldFlow.relationships[i].id === tenantId) {
        alreadyExists = true;
      }
    }

    if (!credentials.includes(tenantId)) {
      res.status(401).send('Unauthorised: Cannot associate flow with a tenant you are not an admin or integrator of');
    } else if (alreadyExists) {
      res.status(409).send('Flow is already associated with this tenant');
    } else {
      const response = await storage.addTenantToFlow(flowId, tenantId);

      if (response.n === 0) {
        res.status(404).send('Flow not found');
      } else if (response.nModified >= 1) {
        res.status(200).send('Successfully added tenant to flow');
      } else {
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
  } else {
    const oldFlow = await storage.getFlowById(flowId, credentials);
    let alreadyExists = false;
    if (!oldFlow) {
      res.status(404).send('Flow not found');
    } else {
      for (let i = 0; i < oldFlow.relationships.length; i += 1) {
        if (oldFlow.relationships[i].type === 'organisation' || oldFlow.relationships[i].id === tenantId) {
          alreadyExists = true;
        }
      }

      if (!alreadyExists) {
        res.status(409).send('Flow is not associated with this tenant');
      } else {
        const response = await storage.deleteTenantFromFlow(flowId, tenantId);


        if (response.n === 0) {
          res.status(404).send('Flow not found');
        } else if (response.nModified >= 1) {
          res.status(200).send('Successfully removed tenant from flow');
        } else {
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

  const storeNode = {
    id: nodeId,
    command: newNode.command,
    name: newNode.name,
    description: newNode.description,
    fields: [{ interval: newNode.fields_interval }],
  };

  const response = await storage.addNodeToFlow(flowId, storeNode, credentials);

  if (!response) {
    res.status(405).send('Invalid input');
  } else {
    res.json(response);
  }
});

router.post('/edge/:oihid/:edgeid', urlParser, async (req, res) => {
  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const newEdge = req.body;
  const credentials = res.locals.credentials[0];

  const storeEdge = {
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
    },
  };


  const response = await storage.addEdgeToFlow(flowId, storeEdge, credentials);
  if (!response) {
    res.status(405).send('Invalid input');
  } else {
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
  const oldNode = await storage.getNodeById(flowId, nodeId, credentials);
  if (!oldNode) {
    res.status(404).send('Node not found');
  } else {
    const fl = oldNode.fields.length;
    if (fl > 0) {
      fields = oldNode.fields;
      let i;
      for (i = 0; i < fl; i += 1) {
        if ('interval' in fields[i]) {
          fields[i].interval = newNode.fields_interval;
        }
      }
    } else {
      fields = [{ interval: newNode.fields_interval }];
    }
  }

  const storeNode = {
    id: nodeId,
    command: newNode.command,
    name: newNode.name,
    description: newNode.description,
    fields,
  };

  const response = await storage.updateNode(flowId, storeNode, credentials);

  if (!response) {
    res.status(404).send('Node not found');
  } else {
    res.json(response);
  }
});

router.put('/edge/:oihid/:edgeid', urlParser, async (req, res) => {
  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const newEdge = req.body;
  const credentials = res.locals.credentials[0];


  const oldNode = await storage.getEdgeById(flowId, edgeId, credentials);
  if (!oldNode) {
    res.status(404).send('Edge not found');
  } else {
    const storeEdge = {
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
      },
    };

    const response = await storage.updateEdge(flowId, storeEdge, credentials);

    if (!response) {
      res.status(404).send('Edge not found');
    } else {
      res.json(response);
    }
  }
});

router.get('/node/:oihid/:nodeid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const nodeId = req.params.nodeid;
  const credentials = res.locals.credentials[1];

  const response = await storage.getNodeById(flowId, nodeId, credentials);

  if (!response) {
    res.status(404).send('Node not found');
  } else {
    res.json(response);
  }
});

router.get('/edge/:oihid/:edgeid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const credentials = res.locals.credentials[1];

  const response = await storage.getEdgeById(flowId, edgeId, credentials);

  if (!response) {
    res.status(404).send('Edge not found');
  } else {
    res.json(response);
  }
});

router.delete('/node/:oihid/:nodeid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const nodeId = req.params.nodeid;
  const credentials = res.locals.credentials[0];

  const response = await storage.deleteNode(flowId, nodeId, credentials);

  if (!response) {
    res.status(404).send('Node not found');
  } else {
    res.json(response);
  }
});

router.delete('/edge/:oihid/:edgeid', jsonParser, async (req, res) => {
  const flowId = req.params.oihid;
  const edgeId = req.params.edgeid;
  const credentials = res.locals.credentials[0];

  const response = await storage.deleteEdge(flowId, edgeId, credentials);

  if (!response) {
    res.status(404).send('Edge not found');
  } else {
    res.json(response);
  }
});


module.exports = router;
