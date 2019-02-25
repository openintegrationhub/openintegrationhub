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
const publisher = require('../../utils/publish');

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
    return res.status(400).send('Invalid id');
  }

  if (!res.locals.admin && credentials.length <= 0) {
    return res.status(403).send('User does not have permissions to view flows');
  }

  if (res.locals.admin) {
    flow = await storage.startFlow('admin', flowId);
  } else {
    flow = await storage.startFlow(credentials, flowId);
  }

  if (!flow) {
    return res.status(404).send('No flow with this ID found');
  }

  const ev = {
    headers: {
      name: 'flow.starting',
    },
    payload: flow,
  };

  await publisher.publish(ev);
  return res.status(200).send(ev);
});

// Start a flow
router.post('/:id/stop', jsonParser, async (req, res) => {
  const flowId = req.params.id;
  const credentials = res.locals.credentials[1];
  let flow;

  if (!mongoose.Types.ObjectId.isValid(flowId)) {
    return res.status(400).send('Invalid id');
  }

  if (!res.locals.admin && credentials.length <= 0) {
    return res.status(403).send('User does not have permissions to view flows');
  }

  if (res.locals.admin) {
    flow = await storage.stopFlow('admin', flowId);
  } else {
    flow = await storage.stopFlow(credentials, flowId);
  }

  if (!flow) {
    return res.status(404).send('No flow with this ID found');
  }

  const ev = {
    headers: {
      name: 'flow.stopping',
    },
    payload: flow,
  };

  await publisher.publish(ev);
  return res.status(200).send(ev);
});


module.exports = router;
