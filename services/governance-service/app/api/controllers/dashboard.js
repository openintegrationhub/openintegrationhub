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

// Gets overview of data distribution
router.get('/distribution', jsonParser, can('tenant.all'), async (req, res) => {

});

// Gets detailed information about a single object
router.get('/objectStatus/:id', jsonParser, can('tenant.all'), async (req, res) => {

});

// Gets a list of current warnings and advisories
router.get('/warnings', jsonParser, can('tenant.all'), async (req, res) => {

});

// Gets a combined list of all available data
router.get('/dashboard', jsonParser, can('tenant.all'), async (req, res) => {

});

// Mark a particular warning as resolved or ignored
router.patch('/warnings/:id', jsonParser, can('tenant.all'), async (req, res) => {

});

module.exports = router;
