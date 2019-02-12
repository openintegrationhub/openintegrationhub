/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const config = require('../../config/index');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// require our MongoDB-Model
const Flow = require('../../models/flow');

// Gets all flows
router.get('/', jsonParser, async (req, res) => {
  const credentials = res.locals.credentials[1];
  let response;
  let error = false;

  if (!res.locals.admin && credentials.length <= 0) {
    res.status(403).send('User does not have permissions to view flows');
  }

  let pageSize = 10;
  let pageNumber = 1;

  const filters = {};
  const filterTypes = { ordinary: 1, long_running: 1 };

  let searchString = '';

  const sortableFields = { createdAt: 1, updatedAt: 1, name: 1 };
  let sortField = 'id';
  let sortOrder = '1';

  // page[size]
  if (req.query.page && (req.query.page.size !== undefined && pageSize > 1)) {
    pageSize = parseInt(req.query.page.size, 10);
  }
  // page[number]
  if (req.query.page && (req.query.page.number !== undefined && pageNumber > 0)) {
    pageNumber = parseInt(req.query.page.number, 10);
  }

  // filter[has_draft] 1 0
  // if (req.query.filter && (req.query.filter.has_draft !== undefined)) {
  // TODO: Define draft
  // }

  // filter[status] 1 0
  if (req.query.filter && req.query.filter.status !== undefined) {
    if (req.query.filter.status === '1') {
      filters.status = 'active';
    } else if (req.query.filter.status === '0') {
      filters.status = 'inactive';
    } else if (!res.headersSent) {
      res.status(400).send('Invalid filter[status] parameter');
      return;
    }
  }

  // filter[type] (ordinary, long_running)
  if (req.query.filter && req.query.filter.type !== undefined) {
    if (req.query.filter.type in filterTypes) {
      filters.type = req.query.filter.type;
    } else if (!res.headersSent) {
      res.status(400).send('Invalid filter[type] parameter');
      return;
    }
  }

  // filter[user]
  if (req.query.filter && req.query.filter.user !== undefined) {
    if (!res.locals.admin && (!res.headersSent)) {
      res.status(403).send('Filtering by user is only available to admins');
      return;
    }
    filters.user = req.query.filter.user;
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

    if (error && !res.headersSent) {
      res.status(400).send('Invalid sort parameter');
      return;
    }
  }

  // search
  if (req.query.search !== undefined) {
    searchString = req.query.search.replace(/[^a-z0-9\p{L}\-_\s]/img, '');
    searchString = searchString.replace(/(^[\s]+|[\s]$)/img, '');
  }

  if (res.locals.admin) {
    response = await storage.getFlows('admin', pageSize, pageNumber, searchString, filters, sortField, sortOrder); // eslint-disable-line
  } else {
    response = await storage.getFlows(credentials, pageSize, pageNumber, searchString, filters, sortField, sortOrder); // eslint-disable-line
  }

  if (response.data.length === 0 && !res.headersSent) {
    return res.status(404).send('No flows found');
  } if (!res.headersSent) {
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

  if (!res.locals.admin && credentials.length <= 0) {
    return res.status(403).send('User does not have permissions to write flows');
  }

  newFlow.createdAt = timestamp;
  newFlow.updatedAt = timestamp;
  // Automatically adds the current user as an owner.
  if (!newFlow.owners) {
    newFlow.owners = [];
  }
  newFlow.owners.push({ id: credentials[0], type: 'user' });

  const storeFlow = new Flow(newFlow);

  if (!res.headersSent) {
    try {
      const response = await storage.addFlow(storeFlow);
      return res.status(201).send(response);
    } catch (err) {
      log.error(err);
      return res.status(500).send(err);
    }
  }
});

// Updates a flow with body data
router.patch('/:id', jsonParser, async (req, res) => {
  const updateData = req.body;
  const readCredentials = res.locals.credentials[1];
  const writeCredentials = res.locals.credentials[0];
  const now = new Date();
  const timestamp = now.toString();

  // Get the flow to retrieve the updated version and version history
  const oldFlow = await storage.getFlowById(req.params.id, readCredentials);
  if (!oldFlow) {
    res.status(404).send('Flow not found');
  } else {
    if (config.usePermissions) {
      let permitted = false;

      // Checks whether the user has write permissions for this flow by attempting to match credentials to the flow's owners.
      for (let i = 0; i < oldFlow.owners.length; i += 1) {
        if (writeCredentials.includes(oldFlow.owners[i].id)) {
          permitted = true;
          break;
        }
      }
      if (!permitted) {
        res.status(403).send('User does not have write permissions for this flow');
      }
    }

    const updateFlow = Object.assign(oldFlow, updateData);
    updateFlow.updatedAt = timestamp;

    // Re-adds the current user to the owners array if they're missing
    if (!updateFlow.owners.some(e => e.id === writeCredentials[0])) {
      updateFlow.owners.push({ id: writeCredentials[0], type: 'user' });
    }

    const storeFlow = new Flow(updateFlow);

    if (!res.headersSent) {
      try {
        const response = await storage.updateFlow(storeFlow, writeCredentials);
        if (!response) {
          res.status(404).send('Flow not found');
        } else {
          res.status(200).send(response);
        }
      } catch (err) {
        res.status(500).send(err);
      }
    }
  }
});

// Gets a flow by id
router.get('/:id', jsonParser, async (req, res) => {
  const flowId = req.params.id;
  const credentials = res.locals.credentials[1];
  let response;

  if (!res.locals.admin && credentials.length <= 0) {
    res.status(403).send('User does not have permissions to view flows');
  }

  if (res.locals.admin) {
    response = await storage.getAnyFlowById(flowId);
  } else {
    response = await storage.getFlowById(flowId, credentials);
  }

  if (!res.headersSent) {
    if (!response) {
      res.status(404).send('No flows found');
    } else {
      res.status(200).send(response);
    }
  }
});


// Deletes a flow
router.delete('/:id', jsonParser, async (req, res) => {
  const flowId = req.params.id;
  const readCredentials = res.locals.credentials[1];
  const writeCredentials = res.locals.credentials[0];

  const oldFlow = await storage.getFlowById(flowId, readCredentials);
  if (!oldFlow) {
    res.status(404).send('Flow not found');
  } else {
    if (config.usePermissions) {
      let permitted = false;

      // Checks whether the user has write permissions for this flow by attempting to match credentials to the flow's owners.
      for (let i = 0; i < oldFlow.owners.length; i += 1) {
        if (writeCredentials.includes(oldFlow.owners[i].id)) {
          permitted = true;
          break;
        }
      }
      if (!permitted) {
        res.status(403).send('User does not have write permissions for this flow');
      }
    }

    if (!res.headersSent) {
      const response = await storage.deleteFlow(flowId, writeCredentials);

      if (!response) {
        res.status(404).send('Flow not found');
      } else {
        res.status(200).send('Flow was successfully deleted');
      }
    }
  }
});

// The following functions are currently deactivated, but may become relevant again in the future

// // Gets flows by user
// router.get('/user/:relationid', jsonParser, async (req, res) => {
//   const relId = req.params.relationid;
//   const credentials = res.locals.credentials[1];
//
//   if (relId !== credentials[0]) {
//     res.status(401).send('Unauthorised: Cannot Get flows from users other than yourself');
//   } else {
//     const response = await storage.getFlowsByUser(relId, credentials);
//
//     if (!response || response.length === 0) {
//       res.status(404).send('No flows found');
//     } else {
//       res.json(response);
//     }
//   }
// });
//
// // Gets flows by tenant
// router.get('/tenant/:relationid', jsonParser, async (req, res) => {
//   const relId = req.params.relationid;
//   const credentials = res.locals.credentials[1];
//
//   if (!credentials.includes(relId)) {
//     res.status(401).send('Unauthorised: Cannot Get flows of tenants you are not a member of');
//   } else {
//     const response = await storage.getFlowsByTenant(relId, credentials);
//
//     if (!response || response.length === 0) {
//       res.status(404).send('No flows found');
//     } else {
//       res.json(response);
//     }
//   }
// });


// Updates a flow wih form data
// router.post('/:id', urlParser, async (req, res) => {
//   const flowId = req.params.id;
//   const credentials = res.locals.credentials[0];
//
//
//   // Get the flow to retrieve the new version and version history
//   const oldFlow = await storage.getFlowById(flowId, credentials);
//   if (!oldFlow) {
//     res.status(404).send('Flow not found');
//   }
//
//
//   const storeFlow = {
//     type: oldFlow.type,
//     id: flowId,
//     links: oldFlow.links,
//     attributes: {
//       name: req.body.name,
//       status: req.body.status,
//       current_status: req.body.current_status,
//       default_mapper_type: oldFlow.attributes.default_mapper_type,
//       description: oldFlow.attributes.description,
//       updated_at: oldFlow.attributes.updated_at,
//       latest_version: oldFlow.attributes.latest_version,
//       versions: oldFlow.attributes.versions,
//     },
//     relationships: oldFlow.relationships,
//     graph: oldFlow.graph,
//   };
//
//   const response = await storage.updateFlow(storeFlow, credentials);
//
//   if (!response) {
//     res.status(404).send('Flow not found');
//   } else {
//     res.json(response);
//   }
// });


// Adds a tenant to a flow by pushing it to its organisations array
// router.post('/tenant/:id/:tenantid', jsonParser, async (req, res) => {
//   const flowId = req.params.id;
//   const tenantId = req.params.tenantid;
//   const credentials = res.locals.credentials[0];
//
//   // Checks whether flow already has this tenant
//   let alreadyExists = false;
//
//   const oldFlow = await storage.getFlowById(flowId, credentials);
//
//   if (!oldFlow) {
//     res.status(404).send('Flow not found');
//   } else {
//     for (let i = 0; i < oldFlow.relationships.length; i += 1) {
//       if (oldFlow.relationships[i].type === 'organisation' || oldFlow.relationships[i].id === tenantId) {
//         alreadyExists = true;
//       }
//     }
//
//     if (!credentials.includes(tenantId)) {
//       res.status(401).send('Unauthorised: Cannot associate flow with a tenant you are not an admin or integrator of');
//     } else if (alreadyExists) {
//       res.status(409).send('Flow is already associated with this tenant');
//     } else {
//       const response = await storage.addTenantToFlow(flowId, tenantId);
//
//       if (response.n === 0) {
//         res.status(404).send('Flow not found');
//       } else if (response.nModified >= 1) {
//         res.status(200).send('Successfully added tenant to flow');
//       } else {
//         res.status(500).send('Could not add tenant to flow');
//       }
//     }
//   }
// });
//
// // Removes a tenant from a flow by pulling the entry from its array
// router.delete('/tenant/:id/:tenantid', jsonParser, async (req, res) => {
//   const flowId = req.params.id;
//   const tenantId = req.params.tenantid;
//   const credentials = res.locals.credentials[0];
//
//
//   if (!credentials.includes(tenantId)) {
//     res.status(401).send('Unauthorised: Cannot remove flow from a tenant you are not an admin or integrator of');
//   } else {
//     const oldFlow = await storage.getFlowById(flowId, credentials);
//     let alreadyExists = false;
//     if (!oldFlow) {
//       res.status(404).send('Flow not found');
//     } else {
//       for (let i = 0; i < oldFlow.relationships.length; i += 1) {
//         if (oldFlow.relationships[i].type === 'organisation' || oldFlow.relationships[i].id === tenantId) {
//           alreadyExists = true;
//         }
//       }
//
//       if (!alreadyExists) {
//         res.status(409).send('Flow is not associated with this tenant');
//       } else {
//         const response = await storage.deleteTenantFromFlow(flowId, tenantId);
//
//
//         if (response.n === 0) {
//           res.status(404).send('Flow not found');
//         } else if (response.nModified >= 1) {
//           res.status(200).send('Successfully removed tenant from flow');
//         } else {
//           res.status(500).send('Could not remove tenant from flow');
//         }
//       }
//     }
//   }
// });
//
// router.post('/node/:id/:nodeid', urlParser, async (req, res) => {
//   const flowId = req.params.id;
//   const nodeId = req.params.nodeid;
//   const newNode = req.body;
//   const credentials = res.locals.credentials[0];
//
//   const storeNode = {
//     id: nodeId,
//     command: newNode.command,
//     name: newNode.name,
//     description: newNode.description,
//     fields: [{ interval: newNode.fields_interval }],
//   };
//
//   const response = await storage.addNodeToFlow(flowId, storeNode, credentials);
//
//   if (!response) {
//     res.status(405).send('Invalid input');
//   } else {
//     res.json(response);
//   }
// });
//
// router.post('/edge/:id/:edgeid', urlParser, async (req, res) => {
//   const flowId = req.params.id;
//   const edgeId = req.params.edgeid;
//   const newEdge = req.body;
//   const credentials = res.locals.credentials[0];
//
//   const storeEdge = {
//     id: edgeId,
//     config: {
//       mapper_type: newEdge.mapper_type,
//       condition: newEdge.condition,
//       mapper: {
//         to: newEdge.mapper_to,
//         subject: newEdge.mapper_subject,
//         textbody: newEdge.mapper_textbody,
//       },
//       source: newEdge.source,
//       target: newEdge.target,
//     },
//   };
//
//
//   const response = await storage.addEdgeToFlow(flowId, storeEdge, credentials);
//   if (!response) {
//     res.status(405).send('Invalid input');
//   } else {
//     res.json(response);
//   }
// });
//
// router.put('/node/:id/:nodeid', urlParser, async (req, res) => {
//   const flowId = req.params.id;
//   const nodeId = req.params.nodeid;
//   const newNode = req.body;
//   const credentials = res.locals.credentials[0];
//
//   let fields;
//
//   // Get the current nodedata
//   const oldNode = await storage.getNodeById(flowId, nodeId, credentials);
//   if (!oldNode) {
//     res.status(404).send('Node not found');
//   } else {
//     const fl = oldNode.fields.length;
//     if (fl > 0) {
//       fields = oldNode.fields;
//       let i;
//       for (i = 0; i < fl; i += 1) {
//         if ('interval' in fields[i]) {
//           fields[i].interval = newNode.fields_interval;
//         }
//       }
//     } else {
//       fields = [{ interval: newNode.fields_interval }];
//     }
//   }
//
//   const storeNode = {
//     id: nodeId,
//     command: newNode.command,
//     name: newNode.name,
//     description: newNode.description,
//     fields,
//   };
//
//   const response = await storage.updateNode(flowId, storeNode, credentials);
//
//   if (!response) {
//     res.status(404).send('Node not found');
//   } else {
//     res.json(response);
//   }
// });
//
// router.put('/edge/:id/:edgeid', urlParser, async (req, res) => {
//   const flowId = req.params.id;
//   const edgeId = req.params.edgeid;
//   const newEdge = req.body;
//   const credentials = res.locals.credentials[0];
//
//
//   const oldNode = await storage.getEdgeById(flowId, edgeId, credentials);
//   if (!oldNode) {
//     res.status(404).send('Edge not found');
//   } else {
//     const storeEdge = {
//       id: edgeId,
//       config: {
//         mapper_type: newEdge.mapper_type,
//         condition: newEdge.condition,
//         mapper: {
//           to: newEdge.mapper_to,
//           subject: newEdge.mapper_subject,
//           textbody: newEdge.mapper_textbody,
//         },
//         source: newEdge.source,
//         target: newEdge.target,
//       },
//     };
//
//     const response = await storage.updateEdge(flowId, storeEdge, credentials);
//
//     if (!response) {
//       res.status(404).send('Edge not found');
//     } else {
//       res.json(response);
//     }
//   }
// });
//
// router.get('/node/:id/:nodeid', jsonParser, async (req, res) => {
//   const flowId = req.params.id;
//   const nodeId = req.params.nodeid;
//   const credentials = res.locals.credentials[1];
//
//   const response = await storage.getNodeById(flowId, nodeId, credentials);
//
//   if (!response) {
//     res.status(404).send('Node not found');
//   } else {
//     res.json(response);
//   }
// });
//
// router.get('/edge/:id/:edgeid', jsonParser, async (req, res) => {
//   const flowId = req.params.id;
//   const edgeId = req.params.edgeid;
//   const credentials = res.locals.credentials[1];
//
//   const response = await storage.getEdgeById(flowId, edgeId, credentials);
//
//   if (!response) {
//     res.status(404).send('Edge not found');
//   } else {
//     res.json(response);
//   }
// });
//
// router.delete('/node/:id/:nodeid', jsonParser, async (req, res) => {
//   const flowId = req.params.id;
//   const nodeId = req.params.nodeid;
//   const credentials = res.locals.credentials[0];
//
//   const response = await storage.deleteNode(flowId, nodeId, credentials);
//
//   if (!response) {
//     res.status(404).send('Node not found');
//   } else {
//     res.json(response);
//   }
// });
//
// router.delete('/edge/:id/:edgeid', jsonParser, async (req, res) => {
//   const flowId = req.params.id;
//   const edgeId = req.params.edgeid;
//   const credentials = res.locals.credentials[0];
//
//   const response = await storage.deleteEdge(flowId, edgeId, credentials);
//
//   if (!response) {
//     res.status(404).send('Edge not found');
//   } else {
//     res.json(response);
//   }
// });


module.exports = router;
