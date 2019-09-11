const express = require('express');
const bodyParser = require('body-parser');
const log = require('../../utils/logger');
const storage = require('../../utils/mongo');
const { createDummyQueues } = require('../../utils/eventBus');

const jsonParser = bodyParser.json();
const router = express.Router();

function getKeys(connections) {
  const keys = [];
  for (let i = 0; i < connections.length; i += 1) {
    const { targets } = connections[i];
    for (let j = 0; j < targets.length; j += 1) {
      keys.push(`dispatch.${targets[j].flowId}`);
    }
  }
  return keys;
}

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
    const connections = req.body;
    const configuration = {
      connections,
    };
    configuration.tenant = req.user.tenant;

    const response = await storage.upsertConfig(configuration);

    const keys = getKeys(connections);
    await createDummyQueues(keys);

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
