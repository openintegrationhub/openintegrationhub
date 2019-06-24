/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-expressions: "off" */
/* eslint consistent-return: "off" */
/* eslint no-await-in-loop: "off" */
/* eslint max-len: ["error", { "code": 120 }] */

const express = require('express');
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const router = express.Router();

// Ajv schema validator
const Ajv = require('ajv');
const chunkSchema = require('../../models/schemas/chunk.json');
// const payloadSchema = require('../../models/schemas/payload.json');
const ajv = new Ajv({ allErrors: true, jsonPointers: true });

const chunkValidator = ajv.compile(chunkSchema);
// const payloadValidator = ajv.compile(payloadSchema);
const { validateSchema, validateUri, validateSplitSchema } = require('../utils/validator');
const { createChunk, splitChunk, updateChunk } = require('../utils/helpers');

// Models
const Chunk = require('../../models/chunk');

// Logger
const log = require('../../config/logger');

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
    return res.status(400).send({ errors: [{ message: 'Integration Layer Adapter ID required!', code: 400 }] });
  }

  try {
    const chunks = await Chunk.find(selector);

    if (!chunks || chunks.length === 0) {
      return res.status(404).send({ errors: [{ message: 'No chunks found!', code: 404 }] });
    }

    res.status(200).send({ data: chunks, meta: { total: chunks.length } });
  } catch (err) {
    log.error(err);
    // istanbul ignore next
    return res.status(500).send({ errors: [{ message: err }] });
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
  const {
    cid, payload, ilaId, def,
  } = req.body;

  const { schema } = req.body.def;
  const schemaUri = req.body.def.uri;
  const invalidInputSchema = validateSchema(schema);
  let payloadValidator;
  let validSchemaUri;

  if (schemaUri) {
    validSchemaUri = validateUri(req.body.def.uri);
  }

  if (!schemaUri && !schema) {
    return res.status(404).send('URI or schema must be specified!');
  }

  if (invalidInputSchema && !schemaUri) {
    return res.status(400).send('Schema is invalid and schema uri is not provided!');
  }


  if (invalidInputSchema && !validSchemaUri) {
    return res.status(400).send('Neither Schema nor uri are valid!');
  }

  if ((invalidInputSchema && schemaUri && validSchemaUri)
    || (!schema && schemaUri && validSchemaUri)) {
    // TODO: Get a model from OIH Meta Data Repository and then save the chunk
    // payloadValidator = ajv.compile(schema);
    console.log('OIH Meta Data Repository');
    return res.status(200).send('Get schema from OIH Meta Data Repository');
  }

  if (schema && !invalidInputSchema) {
    payloadValidator = ajv.compile(schema);
  }

  const valid = chunkValidator(req.body);
  const validPayload = Object.prototype.hasOwnProperty.call(payload, req.body.cid);

  if (!validPayload) {
    return res.status(400).send({ errors: [{ message: 'Payload does not contain cid!', code: 400 }] });
  }

  if (!valid) {
    return res.status(400).send({ errors: [{ message: 'Input does not match schema!', code: 400 }] });
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
    return res.status(500).send({ errors: [{ message: err }] });
  }
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
