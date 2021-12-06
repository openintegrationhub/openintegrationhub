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

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line
const { getObjectDistribution, checkFlows, getRefs } = require('../../utils/dashboard');
const { getProvenanceEvents } = require('./mongo');

// Gets overview of data distribution
router.get('/distribution', jsonParser, can('tenant.all'), async (req, res) => {
  const distribution = await getObjectDistribution(req.user);

  if (!distribution) return res.status(404).send({ error: [{ message: 'Could not gather distribution' }] });

  res.status(200).send(distribution);
});

// Gets detailed information about a single object
router.get('/objectStatus/:id', jsonParser, can('tenant.all'), async (req, res) => {
  let referenceData;
  if (req.query.recordId) {
    referenceData = await getRefs(false, req.params.id, req.headers.authorization);
  } else {
    referenceData = await getRefs(req.params.id, false, req.headers.authorization);
  }

  const id = req.query.recordId ? referenceData.id : req.params.id;

  if (!id) return res.status(400).send({ errors: [{ message: 'Could not find object oihUid' }] });

  const events = await getProvenanceEvents(req.user, 100, 1, { 'entity.id': id });

  res.status(200).send({ events, refs: referenceData ? referenceData.refs : false });
});

// Gets a list of current warnings and advisories
router.get('/warnings', jsonParser, can('tenant.all'), async (req, res) => {
  const flowWarnings = await checkFlows(req.headers.authorization);

  // TODO: Check for failed delete warnings

  res.status(200).send({ flowWarnings });
});

// Gets a combined list of all available data
router.get('/dashboard', jsonParser, can('tenant.all'), async (req, res) => {
  const distribution = await getObjectDistribution(req.user.sub);
  const flowWarnings = await checkFlows(req.headers.authorization);

  res.status(200).send({ distribution, flowWarnings });
});

// Mark a particular warning as resolved or ignored
// router.patch('/warnings/:id', jsonParser, can('tenant.all'), async (req, res) => {
//
// });

module.exports = router;
