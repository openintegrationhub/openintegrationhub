/* eslint guard-for-in: "off" */

const express = require('express');
const bodyParser = require('body-parser');

// const mongoose = require('mongoose');

const config = require('../../config/index');
const log = require('../../config/logger');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
const router = express.Router();

// Gets all flowTemplateData for given time frame
router.get('/', jsonParser, async (req, res) => {
  let error = false;

  let pageSize = 10;
  let pageNumber = 1;

  const filters = {};

  const sortableFields = { createdAt: 1, updatedAt: 1, statusChangedAt: 1 };
  let sortField = 'statusChangedAt';
  let sortOrder = '1';

  const defaultTimeFrame = Object.entries(config.timeWindows).sort((a, b) => b[1] - a[1])[0][0];
  const timeFrame = (req.query.timeframe) ? req.query.timeframe : defaultTimeFrame;

  try {
    if (!(timeFrame in config.timeWindows)) {
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

    const response = await storage.getAllFlowTemplateData(
      timeFrame,
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

// Gets flowTemplate data to an single entry and given timeFrame
router.get('/:id', jsonParser, async (req, res) => {
  const flowTemplateId = req.params.id;
  const timeFrame = req.query.timeframe;

  try {
    const response = await storage.getFlowTemplateData(timeFrame, req.user, flowTemplateId);
    return res.status(200).send(response);
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Saves new flowTemplate data in all time frames
router.post('/', jsonParser, async (req, res) => {
  const flowTemplateData = req.body;

  try {
    for (const key in config.timeWindows) {
      const timeFrame = key;
      // @todo: handle aggregate of data
      const response = await storage.createFlowTemplateData(timeFrame, req.user, flowTemplateData);
      return res.status(200).send(response);
    }
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Adds flowTemplate data to an existing entry
router.put('/:id', jsonParser, async (req, res) => {
  const flowTemplateId = req.params.id;
  const flowTemplateData = req.body;

  try {
    for (const key in config.timeWindows) {
      const timeFrame = key;
      // @todo: handle aggregate of data
      const response = await storage.updateFlowTemplateData(timeFrame, req.user, flowTemplateId, flowTemplateData);
      return res.status(200).send(response);
    }
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

module.exports = router;
