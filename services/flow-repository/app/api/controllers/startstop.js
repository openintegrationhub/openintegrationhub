/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const config = require('../../config/index');
const { publishQueue } = require('../../utils/eventBus');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line


// Start a flow
router.post('/:id/start', jsonParser, async (req, res) => {
  const flowId = req.params.id;
  const credentials = res.locals.credentials[1];
  let flow;

  if (!mongoose.Types.ObjectId.isValid(flowId)) {
    return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  if (!res.locals.admin && credentials.length <= 0) {
    return res.status(403).send({ errors: [{ message: 'User does not have permissions to view flows', code: 403 }] });
  }

  if (res.locals.admin) {
    const currentFlow = await storage.getAnyFlowById(flowId);
    if (!currentFlow) {
      return res.status(404).send({ errors: [{ message: 'No flow with this ID found', code: 404 }] });
    }

    if (currentFlow.status !== 'inactive') {
      return res.status(409).send({ errors: [{ message: `Flow is not inactive. Current status: ${currentFlow.status}`, code: 409 }] });
    }

    flow = await storage.startingFlow('admin', flowId);
  } else {
    const currentFlow = await storage.getFlowById(flowId, credentials);
    if (!currentFlow) {
      return res.status(404).send({ errors: [{ message: 'No flow with this ID found', code: 404 }] });
    }

    if (currentFlow.status !== 'inactive') {
      return res.status(409).send({ errors: [{ message: `Flow is not inactive. Current status: ${currentFlow.status}`, code: 409 }] });
    }

    flow = await storage.startingFlow(credentials, flowId);
  }

  const ev = {
    headers: {
      name: 'flow.starting',
    },
    payload: flow,
  };

  await publishQueue(ev);
  return res.status(200).send({ data: { id: flow.id, status: flow.status }, meta: {} });
});

// Stop a flow
router.post('/:id/stop', jsonParser, async (req, res) => {
  const flowId = req.params.id;
  const credentials = res.locals.credentials[1];
  let flow;

  if (!mongoose.Types.ObjectId.isValid(flowId)) {
    return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  if (!res.locals.admin && credentials.length <= 0) {
    return res.status(403).send({ errors: [{ message: 'User does not have permissions to view flows', code: 403 }] });
  }

  if (res.locals.admin) {
    const currentFlow = await storage.getAnyFlowById(flowId);
    if (!currentFlow) {
      return res.status(404).send({ errors: [{ message: 'No flow with this ID found', code: 404 }] });
    }

    if (currentFlow.status !== 'active') {
      return res.status(409).send({ errors: [{ message: `Flow is not active. Current status: ${currentFlow.status}`, code: 409 }] });
    }

    flow = await storage.stoppingFlow('admin', flowId);
  } else {
    const currentFlow = await storage.getFlowById(flowId, credentials);
    if (!currentFlow) {
      return res.status(404).send({ errors: [{ message: 'No flow with this ID found', code: 404 }] });
    }

    if (currentFlow.status !== 'active') {
      return res.status(409).send({ errors: [{ message: `Flow is not active. Current status: ${currentFlow.status}`, code: 409 }] });
    }

    flow = await storage.stoppingFlow(credentials, flowId);
  }

  const ev = {
    headers: {
      name: 'flow.stopping',
    },
    payload: flow,
  };

  await publishQueue(ev);
  return res.status(200).send({ data: { id: flow.id, status: flow.status }, meta: {} });
});


module.exports = router;
