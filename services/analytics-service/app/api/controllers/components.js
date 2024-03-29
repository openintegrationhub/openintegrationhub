/* eslint guard-for-in: "off" */

const express = require('express');
const bodyParser = require('body-parser');

// const mongoose = require('mongoose');

const config = require('../../config/index');
const log = require('../../config/logger');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
const router = express.Router();

// Gets all componentsData for given time frame
router.get('/', jsonParser, async (req, res) => {
  let error = false;

  let pageSize = 10;
  let pageNumber = 1;

  const filters = {};

  const statusValues = ['active', 'inactive', 'starting', 'stopping'];

  const sortableFields = { createdAt: 1, updatedAt: 1, statusChangedAt: 1 };
  let sortField = 'bucketStartAt';
  let sortOrder = '1';

  const defaultTimeFrame = Object.entries(config.timeWindows).sort((a, b) => b[1] - a[1])[0][0];
  const interval = (req.query.timeframe) ? req.query.timeframe : defaultTimeFrame;

  try {
    if (!(interval in config.timeWindows)) {
      return res.status(400).send({ errors: [{ message: `Invalid parameter timeFrame. Must be one of: ${Object.keys(config.timeWindows).join(',')}`, code: 400 }] });
    }

    // page[size]
    if (req.query.page && (req.query.page.size !== undefined && pageSize > 1)) {
      pageSize = parseInt(req.query.page.size, 10);
    }
    // page[number]
    if (req.query.page && (req.query.page.number !== undefined && pageNumber > 0)) {
      pageNumber = parseInt(req.query.page.number, 10);
    }

    // Filters

    // filter[status]
    if (req.query.filter && req.query.filter.status !== undefined) {
      if (statusValues.indexOf(req.query.filter.status) > -1) {
        filters.status = req.query.filter.status;
      } else if (!res.headersSent) {
        return res.status(400).send({ errors: [{ message: 'Invalid parameter filter[status]', code: 400 }] });
      }
    }

    // filter[tenant]
    if (req.query.filter && req.query.filter.tenant !== undefined) {
      if (!req.user.isAdmin) {
        return res.status(403).send({ errors: [{ message: 'Filtering by tenant is only available to admins', code: 403 }] });
      }
      // owners
      filters.tenantId = req.query.filter.tenant;
    }

    let from;
    let until;

    if (req.query.from) {
      from = parseInt(req.query.from, 10);
    }

    if (req.query.until) {
      until = parseInt(req.query.until, 10);
    }

    // Sort provided field ascending, descending based on prefix "-"
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

    let customFieldNames;
    if (req.query.fieldNames) {
      customFieldNames = req.query.fieldNames;
    }

    const response = await storage.getAllComponentsData(
      interval,
      req.user,
      pageSize,
      pageNumber,
      filters,
      sortField,
      sortOrder,
      from,
      until,
      customFieldNames,
    );

    return res.status(200).send(response);
  } catch (e) {
    return res.status(500).send(e);
  }
});

// Gets components data to an single entry and given timeFrame
router.get('/:id', jsonParser, async (req, res) => {
  const componentsId = req.params.id;
  const timeFrame = req.query.timeframe;

  try {
    const response = await storage.getComponentsData(timeFrame, req.user, componentsId);
    return res.status(200).send(response);
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Saves new components data in all time frames
router.post('/', jsonParser, async (req, res) => {
  const componentsData = req.body;

  try {
    for (const key in config.timeWindows) {
      const timeFrame = key;
      // @todo: handle aggregate of data
      const response = await storage.createComponentsData(timeFrame, req.user, componentsData);
      return res.status(200).send(response);
    }
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Adds components data to an existing entry
router.put('/:id', jsonParser, async (req, res) => {
  const componentsId = req.params.id;
  const componentsData = req.body;

  try {
    for (const key in config.timeWindows) {
      const timeFrame = key;
      // @todo: handle aggregate of data
      const response = await storage.updateComponentsData(timeFrame, req.user, componentsId, componentsData);
      return res.status(200).send(response);
    }
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

module.exports = router;
