const express = require('express');
const bodyParser = require('body-parser');
const log = require('../../utils/logger');
const storage = require('../../utils/mongo');

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/', jsonParser, async (req, res) => {
  try {
    const response = await storage.getConfig(req.user.tenant);

    if (!response) {
      return res.status(404).send({ errors: [{ status: 404, message: 'Tenant has no config' }] });
    }

    return res.status(200).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

router.put('/', jsonParser, async (req, res) => {
  try {
    const configuration = {
      connections: req.body,
    };
    configuration.tenant = req.user.tenant;

    const response = await storage.upsertConfig(configuration);

    return res.status(201).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

router.delete('/', jsonParser, async (req, res) => {
  try {
    await storage.deleteConfig(req.user.tenant);

    return res.status(200).send('Deletion successful');
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});


module.exports = router;
