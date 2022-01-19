/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');

const express = require('express');
const bodyParser = require('body-parser');

const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');

const defaultFunctions = require('../../config/defaultFunctions');

const storedFunctionCache = require('../../config/storedFunctionCache');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// Adds a new stored function
router.post('/', jsonParser, can(config.flowReadPermission), async (req, res) => {
  const response = await storage.addStoredFunction(req.user, req.body.name, req.body.code);

  storedFunctionCache.upsert(response.id, req.body.name, req.user, req.body.code);
  res.json(response);
});

// Deletes a stored function
router.delete('/:id', jsonParser, can(config.flowReadPermission), async (req, res) => {
  const id = req.params.id;
  const user = req.user;

  const document = await storage.getStoredFunction(user, id);
  const functionName = document.name;

  const response = await storage.deleteStoredFunction(user, id);

  storedFunctionCache.delete(id, functionName, user);
  res.json(response);
});

// Gets a list of all stored functions
router.get('/', jsonParser, can(config.flowReadPermission), async (req, res) => {
  // if (!req.user.isAdmin) {
  //   return res.status(403).send({ errors: [{ message: 'Only available to admins', code: 403 }] });
  // }

  let error = false;

  let pageSize = 10;
  let pageNumber = 1;

  let from = false;
  let until = false;

  const filters = {};
  const filterFields = {
    name: 1,
    id: 1,
  };

  let names;
  if (req.query.names && req.query.names !== undefined) {
    names = req.query.names.replace(/[\s]+/gi, '');
    names = names.split(',');
  }

  // from
  if (req.query.from && req.query.from !== undefined) {
    from = req.query.from;
  }

  // until
  if (req.query.until && req.query.until !== undefined) {
    until = req.query.until;
  }

  const sortableFields = { createdAt: 1, updatedAt: 1 };
  let sortField = 'createdAt';
  let sortOrder = '-1';

  // page[size]
  if (req.query.page && (req.query.page.size !== undefined)) {
    pageSize = parseInt(req.query.page.size, 10);
  }
  // page[number]
  if (req.query.page && (req.query.page.number !== undefined)) {
    pageNumber = parseInt(req.query.page.number, 10);
  }

  // filter field & value
  if (req.query.filter && req.query.filter !== undefined) {
    for (const key in req.query.filter) { // eslint-disable-line
      if (key in filterFields) {
        if (filterFields[key] !== 1) {
          filters[filterFields[key]] = req.query.filter[key];
        } else {
          filters[key] = req.query.filter[key];
        }
      } else {
        // Not allowed
        res.status(400).send({ errors: [{ message: 'Invalid filter field', code: 400 }] });
        return;
      }
    }
  }

  // sort startTime and endTime,  Prefix -
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

  const response = await storage.getStoredFunctions(req.user, pageSize, pageNumber, filters, sortField, sortOrder, from, until, names);

  response.meta.page = pageNumber;
  response.meta.perPage = pageSize;
  response.meta.totalPages = Math.ceil(response.meta.total / pageSize);

  response.defaultFunctions = defaultFunctions;
  res.json(response);
});

module.exports = router;
