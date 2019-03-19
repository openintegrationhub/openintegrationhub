/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const config = require('../../config/index');
const { publishQueue } = require('../../utils/eventBus');

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
    response.meta.totalPages = Math.ceil(response.meta.total / pageSize);
    res.json(response);
  }
});

// Adds a new flow to the repository
router.post('/', jsonParser, async (req, res) => {
  const newFlow = req.body;
  const credentials = res.locals.credentials[0];
  const now = new Date();
  const timestamp = now.toISOString();

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

      const ev = {
        headers: {
          name: 'audit.flowCreated',
        },
        payload: {
          service: 'flow-repository',
          timeStamp: timestamp,
          nameSpace: 'oih-dev-ns',
          payload: {
            tenant: (credentials[1] ? credentials[1] : ''),
            source: credentials[0],
            object: 'flow',
            action: 'createFlow',
            subject: response._id,
            details: `A new flow with the id ${response._id} was created`,
          },
        },
      };

      await publishQueue(ev);

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
  const timestamp = now.toISOString();

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send('Invalid id');
  }

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
    updateFlow._id = updateFlow.id;
    delete updateFlow.id;

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

  if (!mongoose.Types.ObjectId.isValid(flowId)) {
    return res.status(400).send('Invalid id');
  }

  if (!res.locals.admin && credentials.length <= 0) {
    return res.status(403).send('User does not have permissions to view flows');
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

  if (!mongoose.Types.ObjectId.isValid(flowId)) {
    return res.status(400).send('Invalid id');
  }

  const oldFlow = await storage.getFlowById(flowId, readCredentials);
  if (!oldFlow) {
    return res.status(404).send('Flow not found');
  }
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
      return res.status(403).send('User does not have write permissions for this flow');
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
});


module.exports = router;
