/* eslint no-underscore-dangle: "off" */

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const log = require('../../utils/logger');
const storage = require('../../utils/mongo');
const { createDummyQueues } = require('../../utils/eventBus');
const { createFlows, deleteFlows, updateConfigFlows } = require('../../utils/flowCreator');

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

    return res.status(200).send({ meta: {}, data: response || [] });
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
    let applications = [];
    if (req.body.applications) {
      applications = await createFlows(req.body.applications, req.headers.authorization);
    }
    // const applications = await createFlows(req.body, req.headers.authorization);

    if (!applications) {
      return res.status(500).send({ errors: [{ message: 'Could not create flows', code: 500 }] });
    }

    const configuration = {
      applications,
      name: req.body.name,
      dataModel: req.body.dataModel,
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
    let data = req.body;
    if (!Array.isArray(data)) data = [data];
    const config = await storage.getOneConfig(req.user.tenant, req.params.id);

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

// Add one or several apps to an existing configuration
router.patch('/:id/app/:appId', jsonParser, async (req, res) => {
  try {
    let data = req.body;
    if (!Array.isArray(data)) data = [data];
    const config = await storage.getOneConfig(req.user.tenant, req.params.id);

    if (!config) {
      return res.status(404).send({ errors: [{ code: 404, message: 'No config found' }] });
    }

    config.applications = config.applications.map((app) => {
      if (app._id.toString() === req.params.appId) {
        app = { ...app, ...req.body }; //eslint-disable-line
      }
      return app;
    });

    // TODO: Create a diff stop flows affected by any change

    const response = await storage.updateConfig(config);

    return res.status(200).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    return res.status(500).send(e);
  }
});

// Delete a single app from an existing configuration
router.delete('/:id/app/:appId', jsonParser, async (req, res) => {  //eslint-disable-line
  try {
    const config = await storage.getOneConfig(req.user.tenant, req.params.id);

    if (!config) {
      return res.status(404).send({ errors: [{ code: 404, message: 'No config found' }] });
    }

    const index = config.applications.findIndex((app) => app._id.toString() === req.params.appId);

    if (index === -1) {
      return res.status(404).send({ errors: [{ code: 404, message: 'No app found' }] });
    }

    const app = config.applications[index];
    config.applications.splice(index, 1);

    const response = await storage.updateConfig(config);

    res.status(200).send({ meta: {}, data: response });

    await deleteFlows([app], req.headers.authorization);
  } catch (e) {
    log.error(e);
    if (!res.headersSent) {
      return res.status(500).send(e);
    }
  }
});

// Modify an exiting configuration
router.patch('/:id', jsonParser, async (req, res) => {  //eslint-disable-line
  try {
    const config = await storage.getOneConfig(req.user.tenant, req.params.id);

    if (!config) {
      return res.status(404).send({ errors: [{ code: 404, message: 'No config found' }] });
    }

    const newConfig = await updateConfigFlows(config, req.body, req.headers.authorization);

    const response = await storage.updateConfig(newConfig);

    res.status(200).send({ meta: {}, data: response });
  } catch (e) {
    log.error(e);
    if (!res.headersSent) {
      return res.status(500).send(e);
    }
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

    await deleteFlows(config.applications, req.headers.authorization);
  } catch (e) {
    log.error(e);
    if (!res.headersSent) {
      return res.status(500).send(e);
    }
  }
});

module.exports = router;
