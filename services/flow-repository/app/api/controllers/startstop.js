/* eslint no-underscore-dangle: "off" */
/* eslint max-len: "off" */
/* eslint func-names: "off" */
/* eslint consistent-return: "off" */

// const path = require('path');
// const _ = require('lodash');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');
const { publishQueue } = require('../../utils/eventBus');

const storage = require(`./${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// Start multiple flows
router.post('/multiple/start', jsonParser, can(config.flowControlPermission), async (req, res) => {
  const errors = false;
  const results = [];
  const flowIds = req.body;
  try {
    if (!Array.isArray(flowIds)) {
      return res.status(500).send({ errors: [{ message: 'No flow ids given. Expecting an array of flow ids', code: 500 }] });
    }

    for (let i = 0; i < flowIds.length; i += 1) {
      const flowId = flowIds[i];

      if (!mongoose.Types.ObjectId.isValid(flowId)) {
        results.push({ errors: [{ message: 'Invalid id', flowId, code: 400 }] });
        continue; // eslint-disable-line no-continue
      }

      const currentFlow = await storage.getFlowById(flowId, req.user);
      if (!currentFlow) {
        results.push({ errors: [{ message: 'No flow with this ID found', flowId, code: 404 }] });
      }

      const flow = await storage.startingFlow(req.user, flowId);

      const ev = {
        headers: {
          name: 'flow.starting',
        },
        payload: flow,
      };

      ev.payload.startedBy = req.user.sub;

      await publishQueue(ev);

      results.push({ data: { id: flow.id, status: flow.status }, meta: {} });
    }

    if (errors) {
      return res.status(500).send(results);
    }
    return res.status(200).send(results);
  } catch (e) {
    log.error(e);
    results.push(e);
    return res.status(500).send(results);
  }
});

// Stop multiple flows
router.post('/multiple/stop', jsonParser, can(config.flowControlPermission), async (req, res) => {
  const errors = false;
  const results = [];
  const flowIds = req.body;
  try {
    if (!Array.isArray(flowIds)) {
      return res.status(500).send({ errors: [{ message: 'No flow ids given. Expecting an array of flow ids', code: 500 }] });
    }

    for (let i = 0; i < flowIds.length; i += 1) {
      const flowId = flowIds[i];

      if (!mongoose.Types.ObjectId.isValid(flowId)) {
        results.push({ errors: [{ message: 'Invalid id', flowId, code: 400 }] });
        continue; // eslint-disable-line no-continue
      }

      const currentFlow = await storage.getFlowById(flowId, req.user);
      if (!currentFlow) {
        results.push({ errors: [{ message: 'No flow with this ID found', flowId, code: 404 }] });
      }

      const flow = await storage.stoppingFlow(req.user, flowId);

      const ev = {
        headers: {
          name: 'flow.stopping',
        },
        payload: flow,
      };

      await publishQueue(ev);

      results.push({ data: { id: flow.id, status: flow.status }, meta: {} });
    }

    if (errors) {
      return res.status(500).send(results);
    }
    return res.status(200).send(results);
  } catch (e) {
    log.error(e);
    results.push(e);
    return res.status(500).send(results);
  }
});

// Start a flow
router.post('/:id/start', jsonParser, can(config.flowControlPermission), async (req, res) => {
  const flowId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(flowId)) {
    return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  const currentFlow = await storage.getFlowById(flowId, req.user);
  if (!currentFlow) {
    return res.status(404).send({ errors: [{ message: 'No flow with this ID found', code: 404 }] });
  }

  // if (currentFlow.status !== 'inactive') {
  //   return res.status(409).send({ errors: [{ message: `Flow is not inactive. Current status: ${currentFlow.status}`, code: 409 }] });
  // }

  const flow = await storage.startingFlow(req.user, flowId);

  const ev = {
    headers: {
      name: 'flow.starting',
    },
    payload: flow,
  };

  ev.payload.startedBy = req.user.sub;

  await publishQueue(ev);
  return res.status(200).send({ data: { id: flow.id, status: flow.status }, meta: {} });
});

// Stop a flow
router.post('/:id/stop', jsonParser, can(config.flowControlPermission), async (req, res) => {
  const flowId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(flowId)) {
    return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
  }

  const currentFlow = await storage.getFlowById(flowId, req.user);
  if (!currentFlow) {
    return res.status(404).send({ errors: [{ message: 'No flow with this ID found', code: 404 }] });
  }

  // if (currentFlow.status !== 'active') {
  //   return res.status(409).send({ errors: [{ message: `Flow is not active. Current status: ${currentFlow.status}`, code: 409 }] });
  // }

  const flow = await storage.stoppingFlow(req.user, flowId);

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
