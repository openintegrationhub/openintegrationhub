/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');

const express = require('express');
const bodyParser = require('body-parser');


const config = require('../../config/index');

const defaultFunctions = require('../../config/defaultFunctions');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// Applies a policy
router.post('/', jsonParser, async (req, res) => {
  const { data, metadata } = req.body;
  const { action } = req.query;

  if (!metadata || !metadata.policy) {
    return res.status(400).send({ errors: [{ code: 400, message: 'No policy in request' }] });
  }

  if (!data) {
    return res.status(400).send({ errors: [{ code: 400, message: 'No data in request' }] });
  }

  let result = {
    passes: true,
    data,
  };

  // TODO: Load in any DB-based functions if present

  // First, apply any duties if present
  if (metadata.policy.duty && metadata.policy.duty.length) {
    for (let i = 0; i < metadata.policy.duty.length; i += 1) {
      const currentDuty = metadata.policy.duty[i];
      const handler = defaultFunctions.find(el => el.name === currentDuty.action);
      if (handler) {
        result = handler.code(result.data, currentDuty);
      } else {
        log.warn(`Attempted to apply duty action ${currentDuty.action} but could not find handler`);
      }
    }
  }

  // Repeat the process with permissions and their constraints
  if (metadata.policy.permission && metadata.policy.permission.length) {
    for (let i = 0; i < metadata.policy.permission.length; i += 1) {
      const currentPermission = metadata.policy.permission[i];
      let actions = false;
      if (currentPermission.action) {
        actions = currentPermission.action.replace(/[\s]+/g, '');
        actions = actions.split(',');
      }
      if (actions === false || actions.indexOf(action) > -1) {
        const handler = defaultFunctions.find(el => el.name === currentPermission.constraint.operator);
        if (handler) {
          result = handler.code(result.data, currentPermission);
        } else {
          log.warn(`Attempted to apply permission action ${currentPermission.action} but could not find handler`);
        }
      }
    }
  }

  return res.status(200).send(result);
});


module.exports = router;
