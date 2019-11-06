const express = require('express');
const bodyParser = require('body-parser');
const log = require('../../utils/logger');
const storage = require('../../utils/mongo');
const { createDummyQueues } = require('../../utils/eventBus');
const { createFlows, deleteFlows } = require('../../utils/flowCreator');

const jsonParser = bodyParser.json();
const router = express.Router();

function getKeys(applications) {
  const keys = [];
  for (let i = 0; i < applications.length; i += 1) {
    const app = applications[i];

    if (app.inbound.active) {
      for (let j = 0; j < app.outbound.flows.length; j += 1) {
        keys.push(`dispatch.${app.inbound.flows[j].flowId}`);
      }
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
    const applications = await createFlows(req.body, req.headers.authorization);
    const configuration = {
      applications,
    };
    configuration.tenant = req.user.tenant;

    const response = await storage.upsertConfig(configuration);
    const keys = getKeys(applications);
    await createDummyQueues(keys);

    return res.status(201).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

router.delete('/', jsonParser, async (req, res) => {  //eslint-disable-line
  try {
    const config = await storage.getConfig(req.user.tenant);
    await storage.deleteConfig(req.user.tenant);

    res.status(200).send('Deletion successful');

    await deleteFlows(config);
  } catch (e) {
    log.error(e);
    if (!res.headersSent) {
      return res.status(500).send(e);
    }
  }
});


module.exports = router;
