const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
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
      for (let j = 0; j < app.inbound.flows.length; j += 1) {
        keys.push(`dispatch.${app.inbound.flows[j].flowId}`);
      }
    }
  }
  return keys;
}

// Get all configurations of your tenant
router.get('/', jsonParser, async (req, res) => {
  try {
    const response = await storage.getConfigs(req.user.tenant);

    if (!response) {
      return res.status(404).send({ errors: [{ status: 404, message: 'Tenant has no config' }] });
    }

    return res.status(200).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Get a single configuration by id
router.get('/:id', jsonParser, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
    }
    const response = await storage.getOneConfig(req.user.tenant, req.params.id);

    if (!response) {
      return res.status(404).send({ errors: [{ status: 404, message: 'Config not found' }] });
    }

    return res.status(200).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Post a new configuration
router.post('/', jsonParser, async (req, res) => {
  try {
    const applications = await createFlows(req.body, req.headers.authorization);

    if (!applications) {
      return res.status(500).send({ errors: [{ message: 'Could not create flows', code: 500 }] });
    }

    const configuration = {
      applications,
    };
    configuration.tenant = req.user.tenant;

    const response = await storage.createConfig(configuration);
    const keys = getKeys(applications);
    await createDummyQueues(keys);

    return res.status(201).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Add one or several apps to an existing configuration
router.put('/:id/app', jsonParser, async (req, res) => {
  try {
    const config = await storage.getOneConfig(req.user.tenant, req.params.id);
    let data = req.body;

    if (!Array.isArray(data)) data = [data];

    if (!config) {
      return res.status(404).send({ errors: [{ code: 404, message: 'No config found' }] });
    }

    const applications = await createFlows(data, req.headers.authorization);

    if (!applications) {
      return res.status(500).send({ errors: [{ message: 'Could not create flows', code: 500 }] });
    }

    config.applications = config.applications.concat(applications);

    const response = await storage.updateConfig(config);

    return res.status(200).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Delete a single app from an existing configuration
router.delete('/:id/app/:appId', jsonParser, async (req, res) => {
  try {
    return res.status(200).send('App deleted');
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Delete an entire configuration
router.delete('/:id', jsonParser, async (req, res) => {  //eslint-disable-line
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
    }

    const config = await storage.getOneConfig(req.user.tenant, req.params.id);

    if (!config) {
      return res.status(404).send({ errors: [{ message: 'No config found', code: 404 }] });
    }
    await storage.deleteConfig(req.user.tenant, req.params.id);

    res.status(200).send('Deletion successful');

    await deleteFlows(config, req.headers.authorization);
  } catch (e) {
    log.error(e);
    if (!res.headersSent) {
      return res.status(500).send(e);
    }
  }
});


module.exports = router;
