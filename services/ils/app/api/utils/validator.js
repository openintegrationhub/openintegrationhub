/* eslint no-mixed-operators: "off" */

/**
 * @desc Check if schema is invalid
 *
 * @param {Object} schema - Schema object containing all properties
 * @return {Boolean} - return boolen if schema is invalid
 */
const validateSchema = (schema) => schema === ''
  || typeof schema === 'string'
  || typeof schema === 'number'
  || schema === undefined
  || schema === null
  || Array.isArray(schema)
  || Object.entries(schema).length === 0 && schema.constructor === Object;

/**
 * @desc Check if URI match Meta Data Repository hostname
 *
 * @param {String} uri - URI from witch schema must be fetched
 * @return {Boolean} - return boolen if URI matched MDR
 */
const validateUri = (uri) => {
  const MDR_PROTOCOL = 'https:';
  const MDR_HOSTNAME = 'metadata.openintegrationhub.com';
  const MDR_PATHNAME = '/domains/addresses';
  let valid = false;

  const {
    hostname, pathname, protocol,
  } = new URL(uri);

  const inputPath = pathname.includes(MDR_PATHNAME);

  if (hostname === MDR_HOSTNAME && protocol === MDR_PROTOCOL && inputPath) {
    valid = true;
  }
  return valid;
};

/**
 * @desc Check if split schema is valid
 *
 * @param {Object} schema - Schema object containing all properties
 * @return {Boolean} - return boolen if schema is valid
 */
const validateSplitSchema = (schema) => schema.length === 0
 || schema === ''
 || typeof schema === 'string'
 || typeof schema === 'number'
 || schema === undefined
 || schema === null
 || !Array.isArray(schema);

module.exports = { validateSchema, validateUri, validateSplitSchema };
