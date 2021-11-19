/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');
const _ = require('lodash');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
// const request = require('request');
// const { URL } = require('url');
// const path = require('path');
const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');
const { publishQueue } = require('../../utils/eventBus');
const { validate } = require('../../utils/validator');
const { createFlow } = require('../../utils/flowCreator');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();

const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// require our MongoDB-Model
const FlowTemplate = require('../../models/flowTemplate');

// Gets all flowTemplates
router.get('/', jsonParser, can(config.flowTemplateReadPermission), async (req, res) => {
  let error = false;

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

  // filter[status] 1 0
  if (req.query.filter && req.query.filter.status !== undefined) {
    if (req.query.filter.status === '1') {
      filters.status = 'published';
    } else if (req.query.filter.status === '0') {
      filters.status = 'draft';
    } else if (!res.headersSent) {
      res.status(400).send({ errors: [{ message: 'Invalid filter[status] parameter', code: 400 }] });
      return;
    }
  }

  // filter[type] (ordinary, long_running)
  if (req.query.filter && req.query.filter.type !== undefined) {
    if (req.query.filter.type in filterTypes) {
      filters.type = req.query.filter.type;
    } else {
      return res.status(400).send({ errors: [{ message: 'Invalid filter[type] parameter' }] });
    }
  }

  // filter[user]
  if (req.query.filter && req.query.filter.user !== undefined) {
    if (!req.user.isAdmin) {
      return res.status(403).send({ errors: [{ message: 'Filtering by user is only available to admins', code: 403 }] });
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

    if (error) {
      return res.status(400).send({ errors: [{ message: 'Invalid sort parameter', code: 400 }] });
    }
  }

  // search
  if (req.query.search !== undefined) {
    searchString = req.query.search.replace(/[^a-z0-9\p{L}\-_\s]/img, '');
    searchString = searchString.replace(/(^[\s]+|[\s]$)/img, '');
  }

  const response = await storage.getTemplates(req.user, pageSize, pageNumber, searchString, filters, sortField, sortOrder);

  response.meta.page = pageNumber;
  response.meta.perPage = pageSize;
  response.meta.totalPages = Math.ceil(response.meta.total / pageSize);
  res.json(response);
});

// Adds a new flow template to the repository
router.post('/', jsonParser, can(config.flowTemplateWritePermission), async (req, res) => {
  const newTemplate = req.body;

  // Automatically adds the current user as an owner, if not already included.
  if (!newTemplate.owners) {
    newTemplate.owners = [];
  }
  if (newTemplate.owners.findIndex((o) => (o.id === req.user.sub)) === -1) {
    newTemplate.owners.push({ id: req.user.sub, type: 'user' });
  }
  if (req.user.tenant) {
    newTemplate.tenant = req.user.tenant;
  }
  const storeTemplate = new FlowTemplate(newTemplate);
  const errors = validate(storeTemplate);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  try {
    const response = await storage.addTemplate(storeTemplate);

    const ev = {
      headers: {
        name: 'templaterepo.template.created',
      },
      payload: {
        tenant: (req.user.tenant) ? req.user.tenant : '',
        user: req.user.sub,
        flowTemplateId: response.id,
      },
    };

    await publishQueue(ev);

    return res.status(201).send({ data: response, meta: {} });
  } catch (err) {
    log.error(err);
    return res.status(500).send({ errors: [{ message: err }] });
  }
});

// Updates a template with body data
router.patch('/:id', jsonParser, can(config.flowTemplateWritePermission), async (req, res) => {
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ errors: 'Invalid id' });
  }

  // Get the current template
  const oldTemplate = await storage.getTemplateById(req.params.id, req.user);

  if (!oldTemplate) {
    return res.status(404).send({ errors: [{ message: 'Template not found', code: 404 }] });
  }

  // TODO: Decide How to handle Template States when Updated (i.e. Published -> Draft and bump version if changed?)
  /* if (oldTemplate.status !== 'draft') {
     return res.status(409).send({ errors: [{ message: `Flow is not inactive. Current status: ${oldFlow.status}`, code: 409 }] });
  } */

  const updateTemplate = Object.assign(oldTemplate, updateData);
  updateTemplate._id = updateTemplate.id;
  delete updateTemplate.id;

  // Re-adds the current user to the owners array if they're missing
  if (!updateTemplate.owners) {
    updateTemplate.owners = [];
  }
  if (updateTemplate.owners.findIndex((o) => (o.id === req.user.sub)) === -1) {
    updateTemplate.owners.push({ id: req.user.sub, type: 'user' });
  }

  const storeTemplate = new FlowTemplate(updateTemplate);

  const errors = validate(storeTemplate);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  try {
    const response = await storage.updateTemplate(storeTemplate, req.user);
    const ev = {
      headers: {
        name: 'templaterepo.template.modified',
      },
      payload: {
        tenant: (req.user.tenant) ? req.user.tenant : '',
        user: req.user.sub,
        flowTemplateId: response.id,
      },
    };

    await publishQueue(ev);

    res.status(200).send({ data: response, meta: {} });
  } catch (err) {
    res.status(500).send({ errors: [{ message: err }] });
  }
});

// Gets a template by id
router.get('/:id', jsonParser, can(config.flowTemplateReadPermission), async (req, res) => {
  const templateId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(templateId)) {
    return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  const template = await storage.getTemplateById(templateId, req.user);

  if (!template) {
    res.status(404).send({ errors: [{ message: 'Template not found', code: 404 }] });
  } else {
    const response = {
      data: template,
      meta: {},
    };
    res.status(200).send(response);
  }
});

// Deletes a template
router.delete('/:id', can(config.flowTemplateWritePermission), jsonParser, async (req, res) => {
  const templateId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(templateId)) {
    return res.status(400).send({ errors: 'Invalid id' });
  }

  const oldTemplate = await storage.getTemplateById(templateId, req.user);
  if (!oldTemplate) {
    return res.status(404).send({ errors: [{ message: 'Template not found', code: 404 }] });
  }

  /* TODO: Decide if published templates can be directly deleted. If this section is not needed, the first check for "oldTemplate"
  // May not be needed also, because of the check when calling to storage.deleteTemplate()
  if (oldTemplate.status !== 'draft') {
    return res.status(409).send({ errors: [{ message: `Flow is not inactive. Current status: ${oldFlow.status}`, code: 409 }] });
  } */

  const response = await storage.deleteTemplate(templateId, req.user);

  if (!response) {
    res.status(404).send({ errors: [{ message: 'Template not found', code: 404 }] });
  } else {
    const ev = {
      headers: {
        name: 'templaterepo.template.deleted',
      },
      payload: {
        tenant: (req.user.tenant) ? req.user.tenant : '',
        user: req.user.sub,
        templateId,
      },
    };

    await publishQueue(ev);
    res.status(200).send({ msg: 'Template was successfully deleted' });
  }
});

// Generates a flow from the template, plus provided data
router.post('/:id/generate', jsonParser, can(config.flowWritePermission), async (req, res) => {
  const updateData = req.body;
  const auth = req.headers.authorization;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ errors: 'Invalid id' });
  }

  // Get the current template
  const template = await storage.getTemplateById(req.params.id, req.user);

  if (!template) {
    return res.status(404).send({ errors: [{ message: 'Template not found', code: 404 }] });
  }

  const newFlow = _.merge(template, updateData);
  delete newFlow.id;
  delete newFlow.status;
  newFlow.fromTemplate = req.params.id;
  // Re-adds the current user to the owners array if they're missing
  if (!newFlow.owners) {
    newFlow.owners = [];
  }
  if (newFlow.owners.findIndex((o) => (o.id === req.user.sub)) === -1) {
    newFlow.owners.push({ id: req.user.sub, type: 'user' });
  }

  try {
    const response = await createFlow(newFlow, auth);
    log.info('response from createFLow: ', response);
    return res.status(201).send({ data: response, meta: {} });
  } catch (err) {
    log.error(err);
    return res.status(500).send({ errors: [{ message: err }] });
  }
});

module.exports = router;
