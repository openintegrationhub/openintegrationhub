/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

const express = require('express');
const bodyParser = require('body-parser');
// const Ajv = require('ajv');
const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');

const storage = require(`../utils/${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line
// const schema = require('../../models/log.json');
// const payloadSchema = require('../../models/payload.json');

// const ajv = new Ajv();
// ajv.addSchema(payloadSchema);
// const validator = ajv.compile(schema);

// Create new log
router.post('/', jsonParser, can(config.logPushPermission), async (req, res) => {
    const message = req.body;

    // const valid = validator(message);

    // if (!valid) {
    //   if (process.env.NODE_ENV !== 'test') {
    //     log.error('Messageformat is not valid!');
    //     log.error(ajv.errors);
    //   }
    //   return res.status(400).send({ errors: [{ message: `Messageformat is not valid: ${JSON.stringify(ajv.errors)}`, code: 400 }] });
    // }

    try {
        log.info('Saving event to DB...');
        const response = await storage.addEvent(message);
        log.info('Successfully Saved');
        return res.status(201).send(response);
    } catch (error) {
        log.error('Save failed:');
        log.error(error);
        return res.status(500).send({ errors: [{ message: error, code: 500 }] });
    }
});

module.exports = router;
