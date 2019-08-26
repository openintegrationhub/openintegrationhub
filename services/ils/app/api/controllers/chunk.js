/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-expressions: "off" */
/* eslint consistent-return: "off" */
/* eslint no-await-in-loop: "off" */
/* eslint max-len: ["error", { "code": 140 }] */

const express = require('express');
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const router = express.Router();

// Ajv schema validator
const Ajv = require('ajv');
const chunkSchema = require('../../models/schemas/chunk.json');

// Logger
const log = require('../../config/logger');

const { validateSchema, validateSplitSchema } = require('../utils/validator');
const {
  createChunk,
  fetchSchema,
  splitChunk,
  updateChunk,
  loadExternalSchema,
  ilaIdValidator,
} = require('../utils/helpers');

// Models
const Chunk = require('../../models/chunk');

const ajv = new Ajv({
  allErrors: true,
  jsonPointers: true,
  extendRefs: true,
  loadSchema: loadExternalSchema,
  schemaId: 'auto',
  missingRefs: true,
  meta: true,
  validateSchema: true,
});

const chunkValidator = ajv.compile(chunkSchema);

/**
 * @desc Get chunks by ilaId
 *
 * @route   GET /chunks
 * @access  Private
 * @param {String} ilaId - Integration Layer Adapter ID
 * @param {String} key - Split key identifier
 * @return {Object} - Array of chunk objects containing data and meta
 */
router.get('/:ilaId', jsonParser, async (req, res) => {
  const { ilaId } = req.params;
  const { key } = req.query;
  let selector;

  key ? selector = { ilaId, splitKey: key } : selector = { ilaId, valid: true };

  if (!ilaId || ilaId === 'undefined' || '') {
    return res.status(400).send(
      {
        errors:
        [{ message: 'Integration Layer Adapter ID required!', code: 400 }],
      },
    );
  }

  try {
    const chunks = await Chunk.find(selector);

    if (!chunks || chunks.length === 0) {
      return res.status(404).send(
        {
          errors:
            [{ message: 'No chunks found!', code: 404 }],
        },
      );
    }

    res.status(200).send({ data: chunks, meta: { total: chunks.length } });
  } catch (err) {
    log.error(err);
    // istanbul ignore next
    return res.status(500).send(
      {
        errors:
          [{ message: err }],
      },
    );
  }
});

/**
 * @desc Create a chunk object
 *
 * @route   POST /chunks
 * @access  Private
 * @return {Object} - Chunk object containing data and meta
 */
router.post('/', jsonParser, async (req, res) => {
  const valid = chunkValidator(req.body);

  if (!valid) {
    return res.status(400).send(
      {
        errors:
         [{ message: 'Input does not match schema!', code: 400 }],
      },
    );
  }

  const {
    cid, payload, ilaId, def, token,
  } = req.body;
  const { domainId, schema, schemaUri } = req.body.def;
  const invalidInputSchema = validateSchema(schema);

  const validIlaId = await ilaIdValidator(ilaId);

  if (validIlaId) {
    return res.status(400).send(
      {
        errors:
        [{ message: 'ilaId must not contain special characters!', code: 400 }],
      },
    );
  }

  let payloadValidator;

  if (!token) {
    return res.status(401).send(
      {
        errors:
        [{ message: 'Service token not provided!', code: 401 }],
      },
    );
  }

  if ((!domainId && !schemaUri && !schema)
      || ((!domainId && schemaUri) || (domainId && !schemaUri))) {
    return res.status(404).send(
      {
        errors:
          [{ message: 'Domain ID and Schema URI or custom schema must be specified!', code: 404 }],
      },
    );
  }

  if (domainId && schemaUri && schema) {
    return res.status(405).send({
      errors:
              [{ message: 'Either domainId with schemaUri or custom schema must be specified, but not both!', code: 405 }],
    });
  }

  // Fetch schema from MDR
  if (domainId && schemaUri) {
    const domainSchema = await fetchSchema(token, domainId, schemaUri);
    if (domainSchema.statusCode === 404) {
      return res.status(domainSchema.statusCode).send(
        {
          errors:
          [{ message: 'DomainId or schemaUri not found!', code: domainSchema.statusCode }],
        },
      );
    }

    if (domainSchema.statusCode !== 200) {
      return res.status(domainSchema.statusCode).send(
        {
          errors:
            [{ message: domainSchema.message, code: domainSchema.statusCode }],
        },
      );
    }
    try {
      payloadValidator = await ajv.compileAsync(domainSchema.body.data.value);
    } catch (e) {
      log.error('ERROR: ', e);
      return res.status(400).send(
        {
          errors:
            [{ message: 'Schema is invalid!', code: 400 }],
        },
      );
    }
  }

  if (!domainId && !schemaUri && invalidInputSchema) {
    return res.status(400).send('Schema is invalid!');
  }

  if (schema) {
    try {
      payloadValidator = await ajv.compileAsync(schema);
    } catch (e) {
      log.error('ERROR: ', e);
      return res.status(400).send(
        {
          errors:
            [{ message: 'Schema is invalid!', code: 400 }],
        },
      );
    }
  }

  const validPayload = Object.prototype.hasOwnProperty.call(payload, req.body.cid);

  if (!validPayload) {
    return res.status(400).send(
      {
        errors:
          [{ message: 'Payload does not contain cid!', code: 400 }],
      },
    );
  }

  const selector = `payload.${cid}`;
  try {
    const chunk = await Chunk.findOne({ ilaId, [selector]: payload[cid] }).lean();
    let status;

    // Create a chunk if does not exist
    if (!chunk) {
      log.info('Creating chunk ...');
      // TODO: add meta
      const newChunk = await createChunk(ilaId, payload, undefined, undefined, cid, def, payloadValidator);
      return res.status(200).send(newChunk);
    }

    // Update the chunk if it already exists
    log.info('Updating chunk ...');
    const incomingPayload = req.body.payload;
    const incomingCid = req.body.cid;
    const updatedChunk = await updateChunk(chunk, incomingPayload, payloadValidator, def, incomingCid);

    updatedChunk.errors ? status = updatedChunk.errors[0].code : status = 200;

    return res.status(status).send(updatedChunk);
  } catch (err) {
    log.error(err);
    // istanbul ignore next
    return res.status(500).send(
      {
        errors:
          [{ message: err }],
      },
    );
  }
});

/**
 * @desc Validate a SDF object
 *
 * @route   POST /chunks/validate
 * @access  Private
 * @return {Object} - object containing valid property and meta data
 */
router.post('/validate', jsonParser, async (req, res) => {
  const { payload, token, ilaId } = req.body;
  const valid = chunkValidator(req.body);

  const validIlaId = await ilaIdValidator(ilaId);

  if (validIlaId) {
    return res.status(400).send(
      {
        errors:
        [{ message: 'ilaId must not contain special characters!', code: 400 }],
      },
    );
  }

  if (!token) {
    return res.status(401).send(
      {
        errors:
        [{ message: 'Service token not provided!', code: 401 }],
      },
    );
  }

  if (!valid) {
    return res.status(400).send(
      {
        errors:
           [{ message: 'Input does not match schema!', code: 400 }],
      },
    );
  }

  const validPayload = Object.prototype.hasOwnProperty.call(payload, req.body.cid);

  if (!validPayload) {
    return res.status(400).send(
      {
        errors:
            [{ message: 'Payload does not contain cid!', code: 400 }],
      },
    );
  }

  const { domainId, schemaUri } = req.body.def;
  if ((!domainId && !schemaUri)
      || ((!domainId && schemaUri) || (domainId && !schemaUri))) {
    return res.status(404).send(
      {
        errors:
          [{ message: 'Domain ID and Schema URI must be specified!', code: 404 }],
      },
    );
  }

  // Fetch schema from MDR
  const domainSchema = await fetchSchema(token, domainId, schemaUri);
  if (domainSchema.statusCode === 404) {
    return res.status(domainSchema.statusCode).send(
      {
        errors:
          [{ message: 'DomainId or schemaUri not found!', code: domainSchema.statusCode }],
      },
    );
  }

  if (domainSchema.statusCode !== 200) {
    return res.status(domainSchema.statusCode).send(
      {
        errors:
            [{ message: domainSchema.message, code: domainSchema.statusCode }],
      },
    );
  }
  let payloadValidator;

  try {
    const obj = domainSchema.body.data.value;
    // payloadValidator = ajv.compile(domainSchema.body.data.value);
    payloadValidator = await ajv.compileAsync(obj);
  } catch (e) {
    log.error('ERROR: ', e);
    return res.status(400).send(
      {
        errors:
          [{ message: 'Schema is invalid!', code: 400 }],
      },
    );
  }

  const validChunk = payloadValidator(payload);
  res.status(200).send({ data: { valid: validChunk }, meta: {} });
});

/**
 * @desc Split a chunk object
 *
 * @route   POST /chunks/split
 * @access  Private
 * @return {Object} - Splitted objects
 */
router.post('/split', jsonParser, async (req, res) => {
  const {
    payload, ilaId, splitSchema,
  } = req.body;
  let status;

  if (!splitSchema) {
    return res.status(400).send('Split schema is not defined!');
  }

  const invalidSplitSchema = validateSplitSchema(splitSchema);

  if (invalidSplitSchema) {
    return res.status(400).send('Split schema is not valid!');
  }

  const splittedChunk = await splitChunk(splitSchema, payload, ilaId);
  splittedChunk.errors ? status = splittedChunk.errors[0].code : status = 200;

  res.status(status).send(splittedChunk);
});

module.exports = router;
