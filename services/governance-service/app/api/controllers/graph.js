/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */
/* eslint no-tabs: "off" */

// const path = require('path');
// const _ = require('lodash');

const express = require('express');
const bodyParser = require('body-parser');

// const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

const {
  drawGraph,
} = require('../../utils/dashboard');

// Gets overview of data distribution
// , can('tenant.all')
router.get('/', jsonParser, async (req, res) => {
  const graph = {
    "nodes":[
      {"data":{"id":"Google","created":10,"updated":1,"received":4, "deleted":0}},
      {"data":{"id":"Office365","created":11,"updated":3,"received":0, "deleted":0}},
      {"data":{"id":"Snazzy","created":6,"updated":1,"received":14, "deleted":0}},
      {"data":{"id":"Gmail","created":10,"updated":1,"received":3, "deleted":0}},
    ],
    "edges":[
      {"data":{"id":"Flow1","created":5,"updated":1,"received":4,"deleted":0,"source":"Google","target":"Snazzy"}},
      {"data":{"id":"Flow2","created":1,"updated":0,"received":1,"deleted":0,"source":"Snazzy","target":"Office365"}},
      {"data":{"id":"Flow3","created":4,"updated":2,"received":3,"deleted":0,"source":"Office365","target":"Google"}},
      {"data":{"id":"Flow4","created":1,"updated":2,"received":3,"deleted":0,"source":"Snazzy","target":"Gmail"}},
      {"data":{"id":"Flow5","created":10,"updated":0,"received":10,"deleted":0,"source":"Snazzy","target":"Gmail"}},
      {"data":{"id":"Flow6","created":1,"updated":0,"received":3,"deleted":0,"source":"Gmail","target":"Snazzy"}},
    ],
  };

  const html = drawGraph(graph);

  res.status(200).send(html);
});

module.exports = router;
