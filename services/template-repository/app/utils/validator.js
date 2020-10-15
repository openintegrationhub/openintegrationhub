const cronstrue = require('cronstrue');
const log = require('../config/logger'); // eslint-disable-line

function findNode(nodeId, flow) {
  const wasFound = flow.graph.nodes.findIndex((n) => (n.id === nodeId));
  if (wasFound === -1) return false;
  return true;
}

function validate(template) {
  const errors = [];

  // Check for missing required attributes and length using the mongoose validation
  const validateErrors = template.validateSync();
  if (validateErrors) {
    const validateErrorsKeys = Object.keys(validateErrors.errors);
    for (let i = 0; i < validateErrorsKeys.length; i += 1) {
      if (!validateErrors.errors[validateErrorsKeys[i]].message.startsWith('Validation failed')) {
        errors.push({ message: validateErrors.errors[validateErrorsKeys[i]].message, code: 400 });
      }
    }
  }

  // Check if all edges point to nodes that actually exist
  if (template.graph && template.graph.edges && template.graph.edges.length > 0) {
    for (let i = 0; i < template.graph.edges.length; i += 1) {
      if (!findNode(template.graph.edges[i].source, template)) {
        errors.push({ message: `Edge source with id "${template.graph.edges[i].source}" could not be found among nodes.`, code: 400 });
      }

      if (!findNode(template.graph.edges[i].target, template)) {
        errors.push({ message: `Edge target with id "${template.graph.edges[i].target}" could not be found among nodes.`, code: 400 });
      }
    }
  }

  // Check if cron expression is valid
  if (template.cron) {
    try {
      cronstrue.toString(template.cron);
    } catch (e) {
      errors.push({ message: 'Invalid cron expression.', code: 400 });
    }
  }

  return (errors);
}

module.exports = { validate };
