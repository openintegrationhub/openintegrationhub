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


function evaluateSingleConstraint(data, currentPermission) {
  let result = {
    passes: false,
  };
  const handler = defaultFunctions.find(el => el.name === currentPermission.operator);
  if (handler) {
    console.log('Has handler');
    console.log('data', JSON.stringify(data));
    console.log('currentPermission', currentPermission);
    result = handler.code(data, { constraint: currentPermission });
  } else {
    log.warn(`Attempted to evaluate constraint with operator ${currentPermission.operator} but could not find handler`);
  }

  console.log(result);
  return result.passes;
}

function evaluateConstraints(data, current, logicOperator) {
  let passes = false;

  console.log('Current:', JSON.stringify(current));
  if (Array.isArray(current)) {
    console.log(logicOperator, 'Array');
    for (let i = 0; i < current.length; i += 1) {
      console.log('i', i);
      const result = evaluateConstraints(data, current[i], logicOperator);
      if (logicOperator) {
        if (logicOperator === 'or') {
          console.log('current[i]', current[i]);
          console.log('logicOperator', logicOperator);
          console.log('or', result);
          if (result === true) return true;
        } else if (logicOperator === 'xone') {
          console.log('xone', result);
          if (passes === false && result === true) {
            passes = true;
          } else if (passes === true && result === true) {
            return false;
          }
        } else if (logicOperator === 'and') {
          console.log('and', result);
          if (result === false) return false;
          passes = result;
        }
      } else {
        console.log('Implicit and', result);
        if (result === false) return false;
        passes = result;
      }
    }

    console.log('current', current);
    console.log('logicOperator', logicOperator);
    console.log('Result after array loop:', passes);
    return passes;
  }

  if (typeof current === 'object') {
    if ('operator' in current) {
      // evalute single constraint
      console.log('evaluate single constraint');
      console.log(current);
      return evaluateSingleConstraint(data, current);
      // return true;
    } if ('or' in current) {
      console.log("evaluateConstraints(current.or, 'or')");
      passes = evaluateConstraints(data, current.or, 'or');
    } else if ('xone' in current) {
      console.log("evaluateConstraints(current.xone, 'xone')");
      passes = evaluateConstraints(data, current.xone, 'xone');
    } else if ('and' in current) {
      console.log("evaluateConstraints(current.and, 'and')");
      passes = evaluateConstraints(data, current.and, 'and');
    } else {
      console.log('Logic operator not found in:', current);
    }
  } else {
    console.log('Invalid constraint format:', current);
  }

  return passes;
}

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
  // Might be better to only load them when changed and keep stored
  // const storedFunctions = await storage.getStoredFunctions(req.user, 1000);


  // First, apply any duties if present
  if (metadata.policy.duty && metadata.policy.duty.length) {
    for (let i = 0; i < metadata.policy.duty.length; i += 1) {
      const currentDuty = metadata.policy.duty[i];
      const handler = defaultFunctions.find(el => el.name === currentDuty.action);
      if (handler) {
        result = handler.code(result.data, currentDuty);
      } else {
        // let storedHandler = storedFunctions.find(el => el.name === currentDuty.action);
        // if(storedHandler) {
        //   storedHandler
        //   result = storedHandler.code(result.data, currentDuty);
        // } else {
        log.warn(`Attempted to apply duty action ${currentDuty.action} but could not find handler`);
        // }
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
        const passes = evaluateConstraints(result.data, currentPermission.constraint);
        if (passes === false) {
          result.passes = false;
          break;
        }
      }
    }
  }

  return res.status(200).send(result);
});


module.exports = router;
