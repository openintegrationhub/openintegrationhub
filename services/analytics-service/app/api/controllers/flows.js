const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { reportHealth } = require('../../utils/eventBus');
const { reportServiceStatus } = require('../../utils/helpers');

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/', jsonParser, async (req, res) => {
  try {

    return res.status(200).send(response);
  } catch(e) {
    return res.status(500).send(response);
  }
});

module.exports = router;
