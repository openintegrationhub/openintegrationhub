/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-expressions: "off" */
const request = require('request-promise');
const Chunk = require('../../models/chunk');
const log = require('../../config/logger');

let globalToken;

/**
 * @desc Check if chunk is valid and update it
 *
 * @param {Boolean} validChunk - Valid or invalid chunk
 * @param {Object} chunk - Old chunk
 * @param {Object} newPayload - New chunk payload
 * @return {Object} - Updated chunk object containing data and meta
 */
async function updateChunkValidation(validChunk, chunk, newPayload) {
  let valid;

  validChunk ? valid = true : valid = false;

  const response = await Chunk.findOneAndUpdate(
    { _id: chunk._id },
    {
      $set: {
        payload: newPayload,
        valid,
        expireAt: new Date(new Date().getTime() + 1000 * 60 * 60),
      },
    }, { new: true },
  );

  return { data: response, meta: {} };
}

/**
 * @desc Create a new chunk
 *
 * @param {String} ilaId - Integration Layer Adapter ID
 * @param {String} cid - Common identifier
 * @param {Object} payload - Chunk payload
 * @param {Object} splitKey - Unique key from meta object
 * @param {Object} meta - Meta object containing splitKey and user data
 * @param {Object} def - Chunk's def containing domainId, uri and schema
 * @param {Function} payloadValidator - It validates incoming schema
 * @return {Object} - New chunk object containing data and meta
 */
async function createChunk(
  ilaId,
  payload,
  splitKey = undefined,
  meta = {},
  cid = undefined,
  def = undefined,
  payloadValidator = undefined,
) {
  const newChunk = new Chunk({
    ilaId,
    cid,
    payload,
    def,
    splitKey,
    meta,
    expireAt: new Date(new Date().getTime() + 1000 * 60 * 60),
  });
  let validNewChunk;

  payloadValidator ? validNewChunk = payloadValidator(newChunk.payload) : false;

  // const validNewChunk = payloadValidator(newChunk.payload);

  if (validNewChunk) {
    newChunk.valid = true;
    const response = await newChunk.save();
    return { data: response, meta: {} };
  }

  newChunk.valid = false;
  const response = await newChunk.save();
  return { data: response, meta: {} };
}

/**
 * @desc Update a chunk
 *
 * @param {String} chunk -  Old chunk
 * @param {String} cid - Common identifier
 * @param {Object} payload - New chunk payload
 * @param {Object} def - Chunk's def containing domainId, uri and schema
 * @param {Function} payloadValidator - It validates incoming schema
 * @return {Object} - Updated chunk object containing data and meta
 */
async function updateChunk(chunk, payload, payloadValidator, def, cid) {
  const newPayload = Object.assign(chunk.payload, payload);
  const validChunk = payloadValidator(newPayload);
  let validDef = false;
  let flag;

  !chunk.def ? flag = false : flag = true;

  if (flag && (def.domainId === chunk.def.domainId && def.uri === chunk.def.uri)) {
    validDef = true;
  }

  if (cid !== chunk.cid || !validDef) {
    return { errors: [{ message: 'CID and def must match with other flow!', code: 400 }] };
  }
  const response = await updateChunkValidation(validChunk, chunk, newPayload);
  return response;
}

/**
 * @desc Split a chunk
 *
 * @param {Object} splitSchema - Schema model with fields which should be splitted
 * @param {Object} payload - Chunk payload
 * @param {String} ilaId - Integration Layer Adapter ID
 * @return {Object} - New splitted objects
 */
async function splitChunk(splitSchema, payload, ilaId) {
  const results = [];
  let response;

  splitSchema.forEach(async (schema) => {
    const newPayload = {};
    const { splitKey } = schema.meta;
    const { meta } = schema;

    Object.keys(schema.payload).forEach((key) => {
      if (!(key in payload)) {
        newPayload[key] = '';
      } else {
        newPayload[key] = payload[key];
      }
    });

    if (!splitKey) {
      response = { errors: [{ message: 'Split key must be defined!', code: 400 }] };
      return response;
    }

    const newChunk = createChunk(ilaId, newPayload, splitKey, meta);
    return results.push(newChunk);
  });

  if (response && response.errors) {
    return response;
  }

  results.length > 0 ? response = await Promise.all(results) : '';

  return response;
}

/**
 * @desc Fetch Schema from OIH MetaData Repository
 *
 * @param {String} token - IAM token
 * @param {String} domainId - ID of the domain to retrieve schema of
 * @param {String} schemaUri - name of the schema
 * @return {Object} - a retrieved schema from MDR
 */
async function fetchSchema(token, domainId, schemaUri) {
  globalToken = token;
  const MDR_URL = 'http://metadata.openintegrationhub.com/api/v1/domains';
  const options = {
    method: 'GET',
    uri: `${MDR_URL}/${domainId}/schemas/${schemaUri}`,
    json: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    resolveWithFullResponse: true,
  };

  try {
    const response = await request(options);
    return response;
  } catch (e) {
    return e;
  }
}

/**
 * @desc AJV helper function for Asynchronous schema compilation
 *
 * @param {String} uri - external schema uri
 * @return {Object} - a retrieved schema
 */
function loadExternalSchema(uri) {
  const options = {
    method: 'GET',
    uri,
    json: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${globalToken}`,
    },
  };

  return request(options).then((res) => {
    if (res.statusCode >= 400) throw new Error(`Loading error: ${res.statusCode}`);
    return res;
  }).catch((e) => {
    log.error('ERROR: ', e);
  });
}

/**
 * @desc ilaId name validation
 *
 * @param {String} ilaId - external schema uri
 * @return {Boolean} - depending on regex result
 */
function ilaIdValidator(ilaId) {
  const reg = /[' " / ~ > < & # \\ $ * ! ? + @ % ^ ( ),]/g;
  return reg.test(ilaId);
}

module.exports = {
  createChunk,
  updateChunk,
  splitChunk,
  fetchSchema,
  loadExternalSchema,
  ilaIdValidator,
};
