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

const storedFunctionCache = require('../../config/storedFunctionCache');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

function evaluateSingleConstraint(data, currentPermission) {
  let result = {
    passes: false,
  };
  const handler = defaultFunctions.find((el) => el.name === currentPermission.operator);
  if (handler) {
    result = handler.code(data, { constraint: currentPermission });
  } else {
    let found = false;
    if (currentPermission.operator in storedFunctionCache.storedFunctions) {
      for (let i = 0; i < storedFunctionCache.storedFunctions[currentPermission.operator]; i += 1) {
        // @todo: check for user
        // if(storedFunctionCache[currentPermission.operator][i].oihUser === x)
        found = true;
        log.debug(`${currentPermission.operator} found in storedFunctionCache`);
        // @todo: execute code some how
        // result = await storedFunctionCache[currentPermission.operator][i].code(data, { constraint: currentPermission });
        break;
      }
    }

    if (!found) {
      log.warn(`Attempted to evaluate constraint with operator ${currentPermission.operator} but could not find handler`);
    }
  }

  return result.passes;
}

function evaluateConstraints(data, current, logicOperator) {
  let passes = false;

  if (Array.isArray(current)) {
    for (let i = 0; i < current.length; i += 1) {
      const result = evaluateConstraints(data, current[i], logicOperator);
      if (logicOperator) {
        if (logicOperator === 'or') {
          if (result === true) return true;
        } else if (logicOperator === 'xone') {
          if (passes === false && result === true) {
            passes = true;
          } else if (passes === true && result === true) {
            return false;
          }
        } else if (logicOperator === 'and') {
          if (result === false) return false;
          passes = result;
        }
      } else {
        if (result === false) return false;
        passes = result;
      }
    }

    return passes;
  }

  if (typeof current === 'object') {
    if ('operator' in current) {
      // evalute single constraint
      return evaluateSingleConstraint(data, current);
      // return true;
    } if ('or' in current) {
      passes = evaluateConstraints(data, current.or, 'or');
    } else if ('xone' in current) {
      passes = evaluateConstraints(data, current.xone, 'xone');
    } else if ('and' in current) {
      passes = evaluateConstraints(data, current.and, 'and');
    } else {
      log.warn('Logic operator not found in:', current);
    }
  } else {
    log.warn('Invalid constraint format:', current);
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
    passes: false,
    data,
  };

  // TODO: Load in any DB-based functions if present
  // Might be better to only load them when changed and keep stored
  // const storedFunctionCache = await storage.getStoredFunctions(req.user, 1000);

  // First, apply any duties if present
  if (metadata.policy.duty && metadata.policy.duty.length) {
    for (let i = 0; i < metadata.policy.duty.length; i += 1) {
      const currentDuty = metadata.policy.duty[i];
      const handler = defaultFunctions.find((el) => el.name === currentDuty.action);
      if (handler) {
        result = handler.code(result.data, currentDuty);
      } else if (currentDuty.action in storedFunctionCache.storedFunctions) {
        for (let j = 0; j < storedFunctionCache.storedFunctions[currentDuty.action].length; j += 1) {
          // @todo: check for user
          // result = await storedFunctionCache.storedFunctions[currentDuty.action][j].code(result.data, currentDuty);
        }
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
        const passes = evaluateConstraints(result.data, currentPermission.constraint);
        if (passes === false) {
          result.passes = false;
          break;
        } else {
          result.passes = true;
        }
      }
    }
  } else if (action) {
    // Default to false if no permissions at all are present.
    result.passes = false;
  }

  return res.status(200).send(result);
});

module.exports = router;
