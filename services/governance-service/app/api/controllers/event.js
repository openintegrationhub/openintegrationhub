/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const { URL } = require('url');
const path = require('path');
const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');
const { publishQueue } = require('../../utils/eventBus');
const { validate } = require('../../utils/validator');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// require our MongoDB-Model
// const ProvenanceEvents = require('../../models/provenanceEvents');

// Gets all events
router.get('/', jsonParser, can(config.flowReadPermission), async (req, res) => {
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
      filters.status = 'active';
    } else if (req.query.filter.status === '0') {
      filters.status = 'inactive';
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

  const response = await storage.getProvenanceEvents(req.user, pageSize, pageNumber, searchString, filters, sortField, sortOrder);

  if (response.data.length === 0 && !res.headersSent) {
    return res.status(404).send({ errors: [{ message: 'No flows found', code: 404 }] });
  }

  response.meta.page = pageNumber;
  response.meta.perPage = pageSize;
  response.meta.totalPages = Math.ceil(response.meta.total / pageSize);
  res.json(response);
});

module.exports = router;
