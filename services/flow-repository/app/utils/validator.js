const cronstrue = require('cronstrue');
const log = require('../config/logger'); // eslint-disable-line

function findNode(nodeId, flow) {
  const wasFound = flow.graph.nodes.findIndex(n => (n.id === nodeId));
  if (wasFound === -1) return false;
  return true;
}

function validate(flow, user) {
  const errors = [];

  // Check for missing required attributes and length using the mongoose validation
  const validateErrors = flow.validateSync();
  if (validateErrors) {
    const validateErrorsKeys = Object.keys(validateErrors.errors);
    for (let i = 0; i < validateErrorsKeys.length; i += 1) {
      if (!validateErrors.errors[validateErrorsKeys[i]].message.startsWith('Validation failed')) {
        errors.push({ message: validateErrors.errors[validateErrorsKeys[i]].message, code: 400 });
      }
    }
  }

  // Check if status was attempted to be set manually
  if (flow.status && flow.status !== 'inactive') {
    errors.push({ message: 'Flow status cannot be set manually. Use the flow start/stop end points instead.', code: 400 });
  }

  // Check if all edges point to nodes that actually exist
  if (flow.graph && flow.graph.edges && flow.graph.edges.length > 0) {
    for (let i = 0; i < flow.graph.edges.length; i += 1) {
      if (!findNode(flow.graph.edges[i].source, flow)) {
        errors.push({ message: `Edge source with id "${flow.graph.edges[i].source}" could not be found among nodes.`, code: 400 });
      }

      if (!findNode(flow.graph.edges[i].target, flow)) {
        errors.push({ message: `Edge target with id "${flow.graph.edges[i].target}" could not be found among nodes.`, code: 400 });
      }
    }
  }

  // Check if cron expression is valid
  if (flow.cron) {
    try {
      cronstrue.toString(flow.cron);
    } catch (e) {
      errors.push({ message: 'Invalid cron expression.', code: 400 });
    }
  }

  if (flow.isGlobal && !user.isAdmin) {
    errors.push({ message: 'Only admins allowed to create global templates', code: 403 });
  }

  return (errors);
}

module.exports = { validate };
