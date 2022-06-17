/* eslint guard-for-in: "off" */

const express = require('express');
const bodyParser = require('body-parser');

// const mongoose = require('mongoose');

const config = require('../../config/index');
const log = require('../../config/logger');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
const router = express.Router();

// Gets all flowStats for a defined time period
router.get('/', jsonParser, async (req, res) => {
  try {
    const { interval, from, until } = req.query;

    if (!interval || !(interval in config.timeWindows)) {
      return res.status(400).send({ errors: [{ code: 400, message: 'Must specify a valid interval' }] });
    }

    const response = await storage.getFlowStats(interval, from, until);

    return res.status(200).send(response);
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

module.exports = router;
