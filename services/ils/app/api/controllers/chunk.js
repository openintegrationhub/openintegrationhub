/* eslint no-underscore-dangle: "off" */
/* eslint consistent-return: "off" */

const express = require('express');
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const router = express.Router();

// Ajv schema validator
const Ajv = require('ajv');
const chunkSchema = require('../../models/schemas/chunk.json');
const payloadSchema = require('../../models/schemas/payload.json');

const ajv = new Ajv({ allErrors: true, jsonPointers: true });
const chunkValidator = ajv.compile(chunkSchema);
const payloadValidator = ajv.compile(payloadSchema);

// Models
const Chunk = require('../../models/chunk');

// Logger
const log = require('../../config/logger');

// @route   GET /chunk
// @desc    Get a single a chunk
// @access  Private
router.get('/:ilaId', jsonParser, async (req, res) => {
  const { ilaId } = req.params;

  if (!ilaId || ilaId === 'undefined' || '') {
    return res.status(400).send({ errors: [{ message: 'Integration Layer Adapter ID required!', code: 400 }] });
  }

  try {
    const chunks = await Chunk.find({ ilaId, valid: true });

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

// @route   POST /chunk
// @desc    Create a chunk
// @access  Private
router.post('/', jsonParser, async (req, res) => {
  const {
    cid, payload, ilaId, def,
  } = req.body;

  const valid = chunkValidator(req.body);
  const expireAt = new Date(new Date().getTime() + 1000 * 60 * 60);
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

    // Create chunk if does not exist
    if (!chunk) {
      log.info('Chunk created ...');
      // TODO: Get a model from OIH Meta Data Repository and then save the chunk

      const newChunk = new Chunk({
        ilaId,
        cid,
        payload,
        def,
        expireAt,
      });

      const validNewChunk = payloadValidator(newChunk.payload);

      if (validNewChunk) {
        newChunk.valid = true;
        const response = await newChunk.save();
        return res.status(200).send({ data: response, meta: {} });
      }

      newChunk.valid = false;
      const response = await newChunk.save();
      return res.status(200).send({ data: response, meta: {} });
    }

    // Updatethe chunk if it already exists
    log.info('Chunk updated ...');

    const newPayload = Object.assign(chunk.payload, req.body.payload);
    const validChunk = payloadValidator(newPayload);
    let validDef = false;
    let response;

    if (def.domainId === chunk.def.domainId && def.uri === chunk.def.uri) {
      validDef = true;
    }

    if (req.body.cid !== chunk.cid || !validDef) {
      return res.status(400).send({ errors: [{ message: 'CID and def must match with other flow!', code: 400 }] });
    }

    // Validate new object after merge and then update it
    if (validChunk) {
      response = await Chunk.findOneAndUpdate(
        { _id: chunk._id },
        {
          $set: {
            payload: newPayload,
            valid: true,
            expireAt,
          },
        },
        { new: true },
      );
      return res.status(200).send({ data: response, meta: {} });
    }

    response = await Chunk.findOneAndUpdate(
      { _id: chunk._id },
      {
        $set: {
          payload: newPayload,
          valid: false,
          expireAt,
        },
      }, { new: true },
    );

    return res.status(200).send({ data: response, meta: {} });
  } catch (err) {
    log.error(err);
    // istanbul ignore next
    return res.status(500).send({ errors: [{ message: err }] });
  }
});

module.exports = router;
